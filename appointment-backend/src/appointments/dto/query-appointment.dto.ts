import { IsOptional, IsString, IsDateString, IsInt, Min, IsIn } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class QueryAppointmentDto {
  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsIn(['Pending', 'Approved', 'Rejected', 'all'])
  status?: string = 'all';

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}