// dtos/appointment.dto.js
const { IsOptional, IsIn, IsString } = require('class-validator');

class UpdateAppointmentDto {
  @IsOptional()
  @IsIn(['Pending', 'Approved', 'Rejected'], { 
    message: 'Status must be Pending, Approved, or Rejected' 
  })
  status;

  @IsOptional()
  @IsString({ message: 'Comment must be a string' })
  comment;
}

module.exports = { UpdateAppointmentDto };