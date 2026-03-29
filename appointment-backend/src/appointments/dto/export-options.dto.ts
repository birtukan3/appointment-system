import { IsOptional, IsDateString, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export class ExportOptionsDto {
  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsIn(['all', 'Pending', 'Approved', 'Rejected'])
  status?: string;
}