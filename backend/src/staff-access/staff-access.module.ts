import {Module} from '@nestjs/common';
import {StaffAccessController} from './staff-access.controller';
import {StaffAccessService} from './staff-access.service';
import {UserModule} from '../user/user.module';
import {AdminDeliveryTestService} from './admin-delivery-test.service';
import {AdminDeliveryTestController} from './admin-delivery-test.controller';
@Module({
  imports:[UserModule],
  controllers:[StaffAccessController,AdminDeliveryTestController],
  providers:[StaffAccessService,AdminDeliveryTestService],
})
export class StaffAccessModule{}
