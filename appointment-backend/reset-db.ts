import 'reflect-metadata';
import { DataSource } from 'typeorm';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'SmartOffice@2026!',
  database: 'postgres',
});

async function reset() {
  console.log('🔄 Resetting database...');
  await AppDataSource.initialize();
  await AppDataSource.query('DROP DATABASE IF EXISTS appointment_db;');
  console.log('✅ Database dropped');
  await AppDataSource.query('CREATE DATABASE appointment_db;');
  console.log('✅ Database created');
  await AppDataSource.destroy();
  console.log('✅ Database reset completed!');
}

reset().catch(console.error);
