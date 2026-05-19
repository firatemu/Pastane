import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import type { Client } from 'minio';
import { AuditService } from '../audit/audit.service';
import { ERROR_CODES } from '../common/constants/error-codes';
import { AppException } from '../common/exceptions/app.exception';
import type { AuthUser } from '../common/types/auth-user.type';
import { normalizePagination } from '../common/utils/pagination.util';
import { slugify } from '../common/utils/slug.util';
import { PrismaService } from '../database/prisma.service';
import { MINIO_CLIENT } from '../media/providers/minio.provider';
import type { CreateOptionDto } from './dto/create-option.dto';
import type { CreateOptionGroupDto } from './dto/create-option-group.dto';
import type { CreateProductDto } from './dto/create-product.dto';
import type { QueryProductDto } from './dto/query-product.dto';
import type { UpdateProductDto } from './dto/update-product.dto';
@Injectable() export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(MINIO_CLIENT) private readonly minio: Client,
  ) {}
 async list(query:QueryProductDto){ const {page,limit}=normalizePagination(query.page,query.limit); const where:Prisma.ProductWhereInput={deletedAt:null,status:ProductStatus.ACTIVE,category:{deletedAt:null,isActive:true},...(query.categoryId?{categoryId:query.categoryId}:{}),...(query.search?{OR:[{name:{contains:query.search,mode:'insensitive'}},{description:{contains:query.search,mode:'insensitive'}}]}:{}),...(query.minPrice!==undefined||query.maxPrice!==undefined?{price:{...(query.minPrice!==undefined?{gte:new Prisma.Decimal(query.minPrice)}:{}),...(query.maxPrice!==undefined?{lte:new Prisma.Decimal(query.maxPrice)}:{})}}:{})}; const [items,total]=await this.prisma.$transaction([this.prisma.product.findMany({where,skip:(page-1)*limit,take:limit,orderBy:{[query.sortBy??'createdAt']:query.sortOrder??'desc'},include:this.include()}),this.prisma.product.count({where})]); return {items,meta:{page,limit,total,totalPages:Math.ceil(total/limit)}}; }
 async get(id:string,publicOnly=false){ const x=await this.prisma.product.findFirst({where:{id,deletedAt:null,...(publicOnly?{status:ProductStatus.ACTIVE,category:{deletedAt:null,isActive:true}}:{})},include:this.include()}); if(!x) throw new AppException(ERROR_CODES.PRODUCT_NOT_FOUND,'Product not found',HttpStatus.NOT_FOUND); return x; }
 async getBySlug(slug:string){ const x=await this.prisma.product.findFirst({where:{slug,deletedAt:null,status:ProductStatus.ACTIVE,category:{deletedAt:null,isActive:true}},include:this.include()}); if(!x) throw new AppException(ERROR_CODES.PRODUCT_NOT_FOUND,'Product not found',HttpStatus.NOT_FOUND); return x; }
 async create(dto:CreateProductDto,actor?:AuthUser){ await this.assertCategory(dto.categoryId); this.assertDiscount(dto.price,dto.discountedPrice); await this.assertAllergens(dto.allergenIds??[]); const slug=await this.uniqueSlug(dto.name); const created=await this.prisma.product.create({data:{ name:dto.name, description:dto.description, shortDescription:dto.shortDescription, price:new Prisma.Decimal(dto.price), discountedPrice:dto.discountedPrice===undefined?undefined:new Prisma.Decimal(dto.discountedPrice), categoryId:dto.categoryId, status:dto.status, preparationMinutes:dto.preparationMinutes, slug, allergens:{create:(dto.allergenIds??[]).map(allergenId=>({allergenId}))}},include:this.include()}); await this.audit.log({actorId:actor?.sub,action:'products.create',entityType:'Product',entityId:created.id,newValues:{name:created.name,slug:created.slug}}); return created; }
 async update(id:string,dto:UpdateProductDto,actor?:AuthUser){ const current=await this.get(id); if(dto.categoryId) await this.assertCategory(dto.categoryId); this.assertDiscount(dto.price??Number(current.price),dto.discountedPrice); const data={...this.productData(dto),...(dto.name?{slug:await this.uniqueSlug(dto.name,id)}:{})}; const updated=await this.prisma.product.update({where:{id},data,include:this.include()}); await this.audit.log({actorId:actor?.sub,action:'products.update',entityType:'Product',entityId:id,oldValues:{name:current.name,status:current.status},newValues:{name:updated.name,status:updated.status}}); return updated; }
 async remove(id:string,actor?:AuthUser){
   const current=await this.get(id);
   for (const img of current.images) {
     if (img.bucket && img.objectKey) {
       try {
         await this.minio.removeObject(img.bucket, img.objectKey);
       } catch (err) {
         this.logger.warn(`MinIO removeObject failed (${img.bucket}/${img.objectKey}): ${err instanceof Error ? err.message : err}`);
       }
     }
   }
   const removed=await this.prisma.$transaction([
     this.prisma.productImage.updateMany({
       where: { productId: id, deletedAt: null },
       data: { deletedAt: new Date(), isPrimary: false },
     }),
     this.prisma.product.update({ where: { id }, data: { deletedAt: new Date(), status: ProductStatus.INACTIVE } }),
   ]);
   const productRow = removed[1];
   await this.audit.log({actorId:actor?.sub,action:'products.delete',entityType:'Product',entityId:id,oldValues:{name:current.name,status:current.status}});
   return productRow;
 }
 async addGroup(productId:string,dto:CreateOptionGroupDto){ await this.get(productId); return this.prisma.productOptionGroup.create({data:{productId,...dto}}); }
 async addOption(productId:string,groupId:string,dto:CreateOptionDto){ await this.get(productId); const group=await this.prisma.productOptionGroup.findFirst({where:{id:groupId,productId,deletedAt:null}}); if(!group) throw new AppException(ERROR_CODES.PRODUCT_NOT_FOUND,'Option group not found for product',HttpStatus.NOT_FOUND); return this.prisma.productOption.create({data:{optionGroupId:groupId,...dto,priceModifier:new Prisma.Decimal(dto.priceModifier??0)}}); }
 async setAllergens(productId:string,ids:string[]){ await this.get(productId); await this.assertAllergens(ids); await this.prisma.$transaction([this.prisma.productAllergen.deleteMany({where:{productId}}),...ids.map(allergenId=>this.prisma.productAllergen.create({data:{productId,allergenId}}))]); return this.get(productId); }
 private include(){return {category:true,images:{where:{deletedAt:null},orderBy:{sortOrder:'asc'}},allergens:{include:{allergen:true}},optionGroups:{where:{deletedAt:null},include:{options:{where:{deletedAt:null},orderBy:{sortOrder:'asc'}}},orderBy:{sortOrder:'asc'}}} as const}
 private async assertCategory(id:string){ const x=await this.prisma.category.findFirst({where:{id,deletedAt:null}}); if(!x) throw new AppException(ERROR_CODES.CATEGORY_NOT_FOUND,'Category not found',HttpStatus.NOT_FOUND); }
 private async assertAllergens(ids:string[]){ if(!ids.length)return; const count=await this.prisma.allergen.count({where:{id:{in:ids},deletedAt:null}}); if(count!==ids.length) throw new AppException(ERROR_CODES.ALLERGEN_NOT_FOUND,'Allergen not found',HttpStatus.NOT_FOUND); }
 private assertDiscount(price:number,discount?:number){ if(discount!==undefined&&discount>price) throw new AppException(ERROR_CODES.VALIDATION_FAILED,'Discounted price cannot exceed price',HttpStatus.BAD_REQUEST); }
 private productData(dto:Partial<CreateProductDto>){ const rest={...dto}; delete rest.allergenIds; return {...rest,...(rest.price!==undefined?{price:new Prisma.Decimal(rest.price)}:{}),...(rest.discountedPrice!==undefined?{discountedPrice:new Prisma.Decimal(rest.discountedPrice)}:{})}; }
 private async uniqueSlug(name:string,excludeId?:string){ const base=slugify(name); let slug=base; let i=2; while(await this.prisma.product.findFirst({where:{slug,...(excludeId?{id:{not:excludeId}}:{})}})){slug=`${base}-${i++}`;} return slug; }
}
