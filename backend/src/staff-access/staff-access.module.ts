import {Module} from '@nestjs/common';
import {StaffAccessController} from './staff-access.controller';
import {StaffAccessService} from './staff-access.service';
@Module({
  controllers:[StaffAccessController],
  providers:[StaffAccessService],
})
export class StaffAccessModule{}
