import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ReportDocument = HydratedDocument<Aas_report>;

@Schema()
export class Aas_report {
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

export const Aas_reportSchema = SchemaFactory.createForClass(Aas_report);
