export interface ApiEnvelope<T> { data: T; meta?: PaginationMeta; }
export interface PaginationMeta { page: number; limit: number; total: number; totalPages: number; }
export interface Category { id:string; name:string; slug:string; description:string|null; imageUrl:string|null; parentId:string|null; sortOrder:number; isActive:boolean; children?:Category[]; }
export interface Allergen { id:string; name:string; }
export interface ProductImage { id:string; url:string; altText:string|null; sortOrder:number; isPrimary:boolean; }
export interface ProductOption { id:string; name:string; priceModifier:string; isActive:boolean; sortOrder:number; }
export interface ProductOptionGroup { id:string; name:string; isRequired:boolean; isMultiple:boolean; sortOrder:number; options:ProductOption[]; }
export interface Product { id:string; name:string; slug:string; description:string|null; shortDescription:string|null; price:string; discountedPrice:string|null; status:'ACTIVE'|'INACTIVE'|'OUT_OF_STOCK'; preparationMinutes:number|null; categoryId:string; category:Category; images:ProductImage[]; allergens:Array<{allergen:Allergen}>; optionGroups:ProductOptionGroup[]; }
export interface Store { id:string; name:string; phone:string|null; city:string; district:string; address:string; latitude:string|null; longitude:string|null; isActive:boolean; }
export interface DeliveryZone { id:string; name:string; minimumOrderPrice:string|null; deliveryFee:string; estimatedMinutes:number|null; isActive:boolean; }
export interface StockEntry { id:string; productId:string; product:Product; date:string; quantity:number; availableFrom:string|null; availableTo:string|null; }
