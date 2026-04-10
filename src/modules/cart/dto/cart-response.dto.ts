import { ApiProperty } from '@nestjs/swagger';
import { ProductResponseDto } from '../../products/dto/product-response.dto';

export class CartItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: () => ProductResponseDto })
  product: ProductResponseDto;

  @ApiProperty()
  quantity: number;
}

export class CartResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: [CartItemResponseDto] })
  items: CartItemResponseDto[];

  @ApiProperty()
  total: number;
}
