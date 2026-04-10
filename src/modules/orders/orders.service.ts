import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Cart)
    private cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private cartItemRepository: Repository<CartItem>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async createOrder(userId: string): Promise<Order> {
    this.logger.log(`Creating order for user: ${userId}`);

    const cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items', 'items.product'],
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      this.logger.warn(`Order creation failed - cart is empty for user: ${userId}`);
      throw new BadRequestException('Cart is empty');
    }

    for (const item of cart.items) {
      const product = await this.productRepository.findOne({
        where: { id: item.productId },
      });
      if (!product || product.stock < item.quantity) {
        this.logger.warn(`Insufficient stock for product: ${item.product?.name ?? item.productId}`);
        throw new BadRequestException(
          `Insufficient stock for product: ${item.product?.name || item.productId}`,
        );
      }
    }

    let totalAmount = 0;
    const orderItemsData: Partial<OrderItem>[] = [];

    for (const item of cart.items) {
      const product = await this.productRepository.findOne({
        where: { id: item.productId },
      });
      const unitPrice = Number(product.price);
      totalAmount += unitPrice * item.quantity;

      orderItemsData.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
      });

      product.stock -= item.quantity;
      await this.productRepository.save(product);
      this.logger.log(`Decremented stock for product ${product.id}: new stock ${product.stock}`);
    }

    totalAmount = Math.round(totalAmount * 100) / 100;

    const order = this.orderRepository.create({
      userId,
      totalAmount,
      items: [],
    });
    const savedOrder = await this.orderRepository.save(order);

    for (const itemData of orderItemsData) {
      const orderItem = this.orderItemRepository.create({
        ...itemData,
        orderId: savedOrder.id,
      });
      await this.orderItemRepository.save(orderItem);
    }

    await this.cartItemRepository.remove(cart.items);
    this.logger.log(`Order ${savedOrder.id} created successfully with total: ${totalAmount}`);

    return this.orderRepository.findOne({
      where: { id: savedOrder.id },
      relations: ['items', 'items.product'],
    });
  }

  async findAllByUser(userId: string): Promise<Order[]> {
    this.logger.log(`Fetching all orders for user: ${userId}`);

    return this.orderRepository.find({
      where: { userId },
      relations: ['items', 'items.product'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Order> {
    this.logger.log(`Fetching order ${id} for user: ${userId}`);

    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items', 'items.product'],
    });

    if (!order) {
      this.logger.warn(`Order not found: ${id}`);
      throw new NotFoundException(`Order with id ${id} not found`);
    }

    if (order.userId !== userId) {
      this.logger.warn(`Unauthorized access to order ${id} by user ${userId}`);
      throw new ForbiddenException('You do not have access to this order');
    }

    return order;
  }
}
