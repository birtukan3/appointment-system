import { IsOptional, IsIn, IsString } from 'class-validator';

export class UpdateAppointmentDto {
  @IsOptional()
  @IsIn(['Pending', 'Approved', 'Rejected'])
  status?: string;

  @IsOptional()
  @IsString()
  comment?: string;
}