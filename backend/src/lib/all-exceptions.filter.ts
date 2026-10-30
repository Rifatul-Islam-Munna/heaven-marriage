import { ExceptionFilter,Catch,ArgumentsHost,HttpException,HttpStatus,Logger } from '@nestjs/common';
import { Request,Response } from 'express';
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
 private logger=new Logger('HTTP');
 catch(exception:unknown,host:ArgumentsHost){
  const ctx=host.switchToHttp(),response=ctx.getResponse<Response>(),request=ctx.getRequest<Request>();
  const status=exception instanceof HttpException?exception.getStatus():HttpStatus.INTERNAL_SERVER_ERROR;
  const message=exception instanceof HttpException?exception.getResponse():'Internal server error';
  if(status>=500)this.logger.error({status,path:request.path,error:exception instanceof Error?exception.name:'Error'});
  response.status(status).json({statusCode:status,path:request.path,timestamp:new Date().toISOString(),message});
 }
}
