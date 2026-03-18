import { IsOptional, IsString, IsIn } from 'class-validator';

export class ExportOptionsDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsIn(['all', 'Pending', 'Approved', 'Rejected'])
  status?: string;
}