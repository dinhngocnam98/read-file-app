import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ReportDocument = HydratedDocument<Aas_report>;

@Schema()
export class Aas_report {
  @Prop()
  folder_dir: string;

  @Prop()
  file_path: string;

  @Prop()
  chemical_symbol: string;

  @Prop()
  data_lab: object[];

  @Prop({default: Date.now})
  created_at: Date;

  @Prop({default: Date.now, set: (date: Date) => date || Date.now()})
  updated_at: Date;
}


export const Aas_reportSchema = SchemaFactory.createForClass(Aas_report);
