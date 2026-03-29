import { IsNotEmpty, IsOptional, IsBoolean, IsIn, IsString, IsNumber, IsDateString } from 'class-validator';

export class CreateAppointmentDto {
  @IsNotEmpty()
  @IsString()
  serviceName: string;

  @IsNotEmpty()
  @IsString()
  providerName: string;

  @IsNotEmpty()
  @IsDateString()
  datetime: string;

  @IsOptional()
  @IsNumber()
  age?: number;

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
  patientName?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}