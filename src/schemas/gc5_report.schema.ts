import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ReportDocument = HydratedDocument<Gc5_report>;

@Schema()
export class Gc5_report {
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

export const Gc5_reportSchema = SchemaFactory.createForClass(Gc5_report);
