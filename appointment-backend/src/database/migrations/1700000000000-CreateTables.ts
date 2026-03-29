import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
    name = 'InitialSchema1700000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create users table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "users" (
                "id" SERIAL PRIMARY KEY,
                "name" VARCHAR(100) NOT NULL,
                "email" VARCHAR(100) UNIQUE NOT NULL,
                "password" VARCHAR(255) NOT NULL,
                "role" VARCHAR(20) DEFAULT 'user',
                "department" VARCHAR(100),
                "company" VARCHAR(100),
                "phone" VARCHAR(20),
                "countryCode" VARCHAR(10),
                "specialization" VARCHAR(100),
                "experience" INTEGER,
                "qualifications" TEXT,
                "bio" TEXT,
                "availableDays" TEXT,
                "workingHours" JSONB,
                "isActive" BOOLEAN DEFAULT true,
                "lastLogin" TIMESTAMP,
                "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create appointments table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "appointments" (
                "id" SERIAL PRIMARY KEY,
                "serviceName" VARCHAR(100) NOT NULL,
                "providerName" VARCHAR(100) NOT NULL,
                "datetime" TIMESTAMP NOT NULL,
                "userId" INTEGER,
                "userEmail" VARCHAR(100) NOT NULL,
                "userName" VARCHAR(100) NOT NULL,
                "age" INTEGER,
                "gender" VARCHAR(10),
                "company" VARCHAR(100),
                "priority" VARCHAR(20) DEFAULT 'Normal',
                "forSelf" BOOLEAN DEFAULT true,
                "patientName" VARCHAR(100),
                "notes" TEXT,
                "comment" TEXT,
                "status" VARCHAR(20) DEFAULT 'Pending',
                "isArchived" BOOLEAN DEFAULT false,
                "calendarEventId" VARCHAR(255),
                "calendarEventLink" VARCHAR(255),
                "meetLink" VARCHAR(255),
                "calendarSynced" BOOLEAN DEFAULT false,
                "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Create indexes for better performance
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_appointments_providerName" ON "appointments"("providerName");
            CREATE INDEX IF NOT EXISTS "idx_appointments_userEmail" ON "appointments"("userEmail");
            CREATE INDEX IF NOT EXISTS "idx_appointments_status" ON "appointments"("status");
            CREATE INDEX IF NOT EXISTS "idx_appointments_datetime" ON "appointments"("datetime");
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "appointments"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    }
}