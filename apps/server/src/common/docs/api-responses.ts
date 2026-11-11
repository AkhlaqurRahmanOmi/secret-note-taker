import { applyDecorators, HttpStatus, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ErrorCode, ERRORS } from '../errors/error-code';
import { ErrorView, PageMetaView } from './common.view';

/** A success response `{ data: <model> }`. */
export function ApiData(model: Type, status: HttpStatus = HttpStatus.OK, description = 'Success') {
  return applyDecorators(
    ApiExtraModels(model),
    ApiResponse({
      status,
      description,
      schema: { type: 'object', required: ['data'], properties: { data: { $ref: getSchemaPath(model) } } },
    }),
  );
}

/** A paginated response `{ data: <model>[], meta }`. */
export function ApiPage(model: Type, description = 'One page, newest first') {
  return applyDecorators(
    ApiExtraModels(model, PageMetaView),
    ApiResponse({
      status: HttpStatus.OK,
      description,
      schema: {
        type: 'object',
        required: ['data', 'meta'],
        properties: {
          data: { type: 'array', items: { $ref: getSchemaPath(model) } },
          meta: { $ref: getSchemaPath(PageMetaView) },
        },
      },
    }),
  );
}

/** A route's error responses, grouped by status from the ERRORS table. */
export function ApiErrors(...codes: ErrorCode[]) {
  const byStatus = new Map<number, ErrorCode[]>();
  for (const code of codes) byStatus.set(ERRORS[code].status, [...(byStatus.get(ERRORS[code].status) ?? []), code]);
  return applyDecorators(
    ApiExtraModels(ErrorView),
    ...[...byStatus].map(([status, group]) =>
      ApiResponse({
        status,
        description: group.map((code) => `\`${code}\`: ${ERRORS[code].message}`).join('\n\n'),
        schema: { $ref: getSchemaPath(ErrorView) },
      }),
    ),
  );
}
