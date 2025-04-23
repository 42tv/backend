import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GuestGaurd extends AuthGuard('jwt-idx') {}
