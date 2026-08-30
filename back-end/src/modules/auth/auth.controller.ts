import { Controller, Post, Get, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'User login returning assigned system role and target route redirect' })
  @ApiResponse({ status: 200, description: 'Login successful with role and targetRoute' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('register-company')
  @ApiOperation({ summary: 'Self-serve registration of a new company and owner' })
  @ApiResponse({ status: 201, description: 'Company registered successfully returning a JWT' })
  registerCompany(@Body() dto: import('./dto/register-company.dto').RegisterCompanyDto) {
    return this.authService.registerCompany(dto);
  }

  @Get('public-plans')
  @ApiOperation({ summary: 'Get all available plans publicly for registration' })
  @ApiResponse({ status: 200, description: 'Plans fetched successfully' })
  getPublicPlans() {
    return this.authService.getPublicPlans();
  }
}
