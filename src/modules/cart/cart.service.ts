import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { Product } from '../products/entities/product.entity';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    @InjectRepository(Cart)
    private cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private cartItemRepository: Repository<CartItem>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async getCart(userId: string) {
    this.logger.log(`Getting cart for user: ${userId}`);

    const cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items', 'items.product'],
    });

    if (!cart) {
      this.logger.log(`No cart found for user ${userId}, returning empty response`);
      return { id: null, items: [], total: 0 };
    }

    return this.formatCart(cart);
  }

  async addItem(userId: string, addToCartDto: AddToCartDto): Promise<Cart> {
    const { productId, quantity } = addToCartDto;
    this.logger.log(`Adding item to cart - user: ${userId}, product: ${productId}, qty: ${quantity}`);

    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (!product) {
      this.logger.warn(`Product not found: ${productId}`);
      throw new NotFoundException(`Product with id ${productId} not found`);
    }
    if (product.stock < quantity) {
      this.logger.warn(`Insufficient stock for product ${productId}: requested ${quantity}, available ${product.stock}`);
      throw new BadRequestException(
        `Insufficient stock. Available: ${product.stock}`,
      );
    }

    let cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items', 'items.product'],
    });

    if (!cart) {
      cart = this.cartRepository.create({ userId, items: [] });
      await this.cartRepository.save(cart);
    }

    const existingItem = cart.items.find((item) => item.productId === productId);

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (product.stock < newQuantity) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${product.stock}`,
        );
      }
      existingItem.quantity = newQuantity;
      await this.cartItemRepository.save(existingItem);
      this.logger.log(`Updated existing cart item quantity to ${newQuantity}`);
    } else {
      const cartItem = this.cartItemRepository.create({
        cartId: cart.id,
        productId,
        quantity,
      });
      await this.cartItemRepository.save(cartItem);
      this.logger.log(`Added new item to cart`);
    }

    const updatedCart = await this.cartRepository.findOne({
      where: { id: cart.id },
      relations: ['items', 'items.product'],
    });

    return this.formatCart(updatedCart);
  }

  async updateItem(
    userId: string,
    itemId: string,
    updateCartItemDto: UpdateCartItemDto,
  ): Promise<Cart> {
    this.logger.log(`Updating cart item ${itemId} for user: ${userId}`);

    const cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items', 'items.product'],
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    const item = cart.items.find((i) => i.id === itemId);
    if (!item) {
      this.logger.warn(`Cart item not found: ${itemId}`);
      throw new NotFoundException(`Cart item with id ${itemId} not found`);
    }

    if (updateCartItemDto.quantity <= 0) {
      this.logger.log(`Quantity <= 0, removing item ${itemId}`);
      await this.cartItemRepository.remove(item);
    } else {
      item.quantity = updateCartItemDto.quantity;
      await this.cartItemRepository.save(item);
      this.logger.log(`Cart item ${itemId} updated to quantity ${updateCartItemDto.quantity}`);
    }

    const updatedCart = await this.cartRepository.findOne({
      where: { id: cart.id },
      relations: ['items', 'items.product'],
    });

    return this.formatCart(updatedCart);
  }

  async removeItem(userId: string, itemId: string): Promise<Cart> {
    this.logger.log(`Removing item ${itemId} from cart for user: ${userId}`);

    const cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items', 'items.product'],
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    const item = cart.items.find((i) => i.id === itemId);
    if (!item) {
      this.logger.warn(`Cart item not found: ${itemId}`);
      throw new NotFoundException(`Cart item with id ${itemId} not found`);
    }

    await this.cartItemRepository.remove(item);
    this.logger.log(`Cart item ${itemId} removed`);

    const updatedCart = await this.cartRepository.findOne({
      where: { id: cart.id },
      relations: ['items', 'items.product'],
    });

    return this.formatCart(updatedCart);
  }

  async clearCart(userId: string) {
    this.logger.log(`Clearing cart for user: ${userId}`);

    const cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items'],
    });

    if (!cart) {
      this.logger.log(`No cart to clear for user: ${userId}`);
      return { id: null, items: [], total: 0 };
    }

    if (cart.items.length > 0) {
      await this.cartItemRepository.remove(cart.items);
      this.logger.log(`Cleared ${cart.items.length} items from cart`);
    }

    const updatedCart = await this.cartRepository.findOne({
      where: { id: cart.id },
      relations: ['items', 'items.product'],
    });

    return this.formatCart(updatedCart);
  }

  private formatCart(cart: Cart) {
    const items = (cart.items || []).map((item) => ({
      id: item.id,
      product: item.product,
      quantity: item.quantity,
    }));

    const total = items.reduce((sum, item) => {
      return sum + Number(item.product?.price || 0) * item.quantity;
    }, 0);

    return { id: cart.id, items, total: Math.round(total * 100) / 100 } as any;
  }
}
