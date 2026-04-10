import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Product } from './modules/products/entities/product.entity';

@Injectable()
class SeedService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async seed() {
    console.log('Fetching products from dummyjson.com...');

    const response = await fetch('https://dummyjson.com/products?limit=20');
    const json = await response.json();
    const dummyProducts = json.products;

    console.log(`Fetched ${dummyProducts.length} products. Seeding database...`);

    for (const item of dummyProducts) {
      const existing = await this.productRepository.findOne({
        where: { name: item.title },
      });

      if (!existing) {
        const product = this.productRepository.create({
          name: item.title,
          description: item.description,
          price: item.price,
          imageUrl: item.thumbnail,
          stock: item.stock,
        });
        await this.productRepository.save(product);
        console.log(`Seeded product: ${product.name}`);
      } else {
        console.log(`Skipping existing product: ${item.title}`);
      }
    }

    console.log('Seeding complete!');
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'password'),
        database: configService.get<string>('DB_DATABASE', 'ecommerce'),
        ssl: configService.get<string>('DB_SSL') === 'true'
          ? { rejectUnauthorized: false }
          : false,
        entities: [Product],
        synchronize: true,
      }),
    }),
    TypeOrmModule.forFeature([Product]),
  ],
  providers: [SeedService],
})
class SeedModule {}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(SeedModule);
  const seedService = app.get(SeedService);
  await seedService.seed();
  await app.close();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
