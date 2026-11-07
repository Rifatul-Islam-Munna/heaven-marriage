import {Module} from '@nestjs/common';
import {QuestionConfigModule} from '../profile-questions/question-config.module';
import {MemberAdminColumnsService} from './member-admin-columns.service';
import {MemberAdminColumnsController} from './member-admin-columns.controller';

@Module({imports:[QuestionConfigModule],controllers:[MemberAdminColumnsController],providers:[MemberAdminColumnsService]})
export class MemberAdminColumnsModule {}
