import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProdutoDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  nome: string;

  @IsOptional()
  @IsString()
  descricao?: string | null;

  // Aceita "19.90" e também 19.9 (JSON manda número). Converte para string sem
  // arredondar: se vier 19.999, a regex reprova em vez de virar 20.00 calado.
  @Transform(({ value }) => (typeof value === 'number' ? String(value) : value))
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'preco deve ter no máximo 2 casas decimais',
  })
  preco: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  estoque?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  imagemKey?: string | null;
}
