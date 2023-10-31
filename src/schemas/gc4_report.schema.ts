import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ReportDocument = HydratedDocument<Gc4_report>;

@Schema()
export class Gc4_report {
  @Prop()
  folderDir: string;

  @Prop()
  signal_1: object[];

  @Prop()
  signal_2: object[];

  @Prop({default: Date.now})
  created_at: Date;

  @Prop({default: Date.now, set: (date: Date) => date || Date.now()})
  updated_at: Date;
}

export const Gc4_reportSchema = SchemaFactory.createForClass(Gc4_report);
