import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiData, ApiErrors } from '../common/docs/api-responses';
import { ErrorCode } from '../common/errors/error-code';
import { AuthResultView } from './auth.view';
import { AuthResult, AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

/** The only public routes; rate-limited per IP. */
@ApiTags('auth')
@ApiErrors(ErrorCode.RATE_LIMITED)
@Controller('auth')
@Public()
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @ApiOperation({ summary: 'Create an account', description: 'Always creates a `user`; a `role` field is rejected.' })
  @ApiData(AuthResultView, HttpStatus.CREATED, 'Account created; signed in')
  @ApiErrors(ErrorCode.VALIDATION_FAILED, ErrorCode.EMAIL_TAKEN)
  @Post('register')
  register(@Body() dto: RegisterDto): Promise<AuthResult> {
    return this.auth.register(dto);
  }

  @ApiOperation({ summary: 'Log in', description: 'Unknown email and wrong password give the same error.' })
  @ApiData(AuthResultView, HttpStatus.OK, 'Signed in')
  @ApiErrors(ErrorCode.VALIDATION_FAILED, ErrorCode.INVALID_CREDENTIALS)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<AuthResult> {
    return this.auth.login(dto);
  }
}
