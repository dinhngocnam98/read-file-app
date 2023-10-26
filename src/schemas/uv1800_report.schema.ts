import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ReportDocument = HydratedDocument<Uv1800_report>;

@Schema()
export class Uv1800_report {
  @Prop()
  folderDir: string;

  @Prop()
  signal_1: object[];

  @Prop()
  signal_2: object[];

  @Prop()
  created_at: Date;

  @Prop()
  updated_at: Date;
}

export const Uv1800_reportSchema = SchemaFactory.createForClass(Uv1800_report);
