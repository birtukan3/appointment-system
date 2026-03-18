import { IsNotEmpty, IsOptional, IsBoolean, IsIn, IsString } from 'class-validator';

export class CreateAppointmentDto {
  @IsNotEmpty()
  @IsString()
  serviceName: string;

  @IsNotEmpty()
  @IsString()
  providerName: string;

  @IsNotEmpty()
  @IsString()
  datetime: string;

  @IsOptional()
  @IsString()
  age?: string;

  @IsOptional()
  @IsIn(['Male', 'Female', 'Other'])
  gender?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsIn(['Normal', 'High', 'Urgent'])
  priority?: string;

  @IsOptional()
  @IsBoolean()
  forSelf?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}