import 'reflect-metadata';
import { MediaController } from './media.controller';
import { QueryMediaAssetsDto } from './dto/query-media-assets.dto';

describe('MediaController metadata', () => {
  it('preserves runtime query DTO metadata for asset listing', () => {
    const paramTypes = Reflect.getMetadata('design:paramtypes', MediaController.prototype, 'listAssets') as unknown[];

    expect(paramTypes[0]).toBe(QueryMediaAssetsDto);
  });
});
