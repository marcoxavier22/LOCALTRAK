import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class PasswordService {
  private readonly saltRounds = 12;

  hash(value: string) {
    return bcrypt.hash(value, this.saltRounds);
  }

  compare(value: string, hash: string) {
    return bcrypt.compare(value, hash);
  }
}
