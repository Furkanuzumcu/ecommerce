import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async findAll(page = 1, limit = 10, search?: string) {
    this.logger.log(`Fetching products - page: ${page}, limit: ${limit}, search: "${search ?? ''}"`);

    const skip = (page - 1) * limit;
    const where = search ? { name: Like(`%${search}%`) } : {};

    const [data, total] = await this.productRepository.findAndCount({
      where,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    this.logger.log(`Found ${total} products`);
    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<Product> {
    this.logger.log(`Fetching product by id: ${id}`);

    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      this.logger.warn(`Product not found: ${id}`);
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    return product;
  }
}
