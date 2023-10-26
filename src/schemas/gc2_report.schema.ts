import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ReportDocument = HydratedDocument<Gc2_report>;

@Schema()
export class Gc2_report {
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

export const Gc2_reportSchema = SchemaFactory.createForClass(Gc2_report);
