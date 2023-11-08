import { Injectable } from '@nestjs/common';
import * as fs from 'fs-extra';
import * as iconv from 'iconv-lite';
import * as getWinShortcut from 'get-windows-shortcut-properties';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Gc2_report } from '../schemas/gc2_report.schema';

@Injectable()
export class Gc2Service {
  constructor(
    @InjectModel(Gc2_report.name) private Gc2_reportModel: Model<Gc2_report>,
  ) {}
  errorDir: any[] = [];

  async readFileContents(data: any) {
    const shortcuts = await this.readShortcuts(data);
    if (shortcuts && shortcuts.length > 0) {
      for (const file of shortcuts) {
        if (
          file.toUpperCase().endsWith('.TXT') &&
          !file.toUpperCase().includes('SAVED')
        ) {
          await this.readReport(data, file);
        } else if (!file.includes('.')) {
          const newFolderPath = {
            folder_dir: data.folder_dir + '/' + file,
            device: data.device,
          };
          await this.readFileContents(newFolderPath);
        }
      }
    }
  }

  async readRoot(dir: string) {
    const rootInfo = fs.readdirSync(dir);
    const rootFilter = rootInfo.filter((item) => item.includes('GC 2'));
    return rootFilter.map((item: string) => {
      if (item.split('.').pop() === 'lnk') {
        const shortcutInfo = getWinShortcut.sync(dir + '/' + item);
        const targetPath = shortcutInfo[0].TargetPath;
        return {
          folder_dir: targetPath.replace(/\\/g, '/'),
          device: item.split('.').shift(),
        };
      }
      return {
        folder_dir: dir + '/' + item,
        device: item,
      };
    });
  }

  private async readShortcuts(data: any) {
    try {
      const stats = await fs.promises.stat(data.folder_dir);
      if (stats.isDirectory()) {
        const indexErrorDir = this.errorDir.findIndex(
          (item) => item.device === data.device,
        );
        if (indexErrorDir !== -1) {
          this.errorDir.splice(indexErrorDir, 1);
        }
        const shortcuts = fs.readdirSync(data.folder_dir);
        return shortcuts.filter((file: string) => file !== '.DS_Store');
      }
    } catch (err) {
      const indexErrorDir = this.errorDir.findIndex(
        (item) => item.device === data.device,
      );
      if (indexErrorDir === -1) {
        this.errorDir.push({
          folder_dir: data.folder_dir,
          device: data.device,
        });
      }
    }
  }
  private async readReport(data: any, file: string) {
    const filePath = `${data.folder_dir}/${file}`;
    const contents = await this.extractSignalData(filePath);
    // const isSaved = await this.saveReportDb(contents, data);
    // if (isSaved) {
    //   const newFile = file
    //     .toLowerCase()
    //     .replace('.txt', '_saved.txt')
    //     .toUpperCase();
    //   fs.rename(`${data.folder_dir}/${file}`, `${data.folder_dir}/${newFile}`);
    // }
  }

  // Lưu dữ liệu vào database
  async saveReportDb(contents: any[], data: any) {
    const signalData1 = [];
    const signalData2 = [];
    for (const content of contents) {
      if (content.name_signal.includes('Signal 1')) {
        signalData1.push(content);
      } else signalData2.push(content);
    }
    const result = {
      folder_dir: data.folder_dir,
      signal_1: signalData1,
      signal_2: signalData2,
    };
    try {
      switch (true) {
        case data.device.toUpperCase().includes('GC 2'):
          await this.Gc2_reportModel.create(result);
          break;
        default:
          throw new Error('Invalid folder for database');
      }
      return true;
    } catch (err) {
      return false;
    }
  }

  //Loc du lieu
  async extractSignalData(filePath: string) {
    try {
      const fileBuffer = await fs.readFile(filePath);
      // Convert the file buffer from UTF-16 LE with BOM to UTF-8
      const fileContent = iconv.decode(fileBuffer, 'utf16-le');

      // // Extract "Signal" sections
      const gcSummary = fileContent.match(/GC Summary[\s\S]*?Oven/m);
      const oven = fileContent.match(/Oven[\s\S]*?Temperature\r/m);
      const temperature = fileContent.match(
        /Temperature\r[\s\S]*?Thermal Aux 1/m,
      );
      const thermalAux1 = fileContent.match(/Thermal Aux 1[\s\S]*?Column\r/m);
      const column = fileContent.match(/Column[\s\S]*?Column #1\r/m);
      const column1 = fileContent.match(/Column #1[\s\S]*?Column #2\r/m);
      const column2 = fileContent.match(
        /Column #2[\s\S]*?\r\nFront Detector FID\r/m,
      );
      const front_detector_FID = fileContent.match(
        /\nFront Detector FID\r[\s\S]*?Valve 1/m,
      );
      const valve1 = fileContent.match(
        /Valve 1[\s\S]*?Valve 2/m,
      );
      const valve2 = fileContent.match(
        /Valve 2[\s\S]*?Aux/m,
      );
      const Aux_EPC = fileContent.match(
        /Aux EPC 1,2,3[\s\S]*?Valve Box/m,
      );
      const Valve_Box = fileContent.match(
        /Valve Box[\s\S]*?Signals/m,
      );
      const signals = fileContent.match(
        /Signals[\s\S]*?Run Time Events/m,
      );

      if (gcSummary || oven) {
        return this.parseSignalSections(
          gcSummary,
          oven,
          temperature,
          thermalAux1,
          column,
          column1,
          column2,
          front_detector_FID,
          valve1,
          valve2,
          Aux_EPC,
          Valve_Box,
          signals
        );
      } else {
        throw new Error(
          `Signal data not found in the provided text. direct: ${filePath}`,
        );
      }
    } catch (error) {
      throw new Error(`Error reading or processing the file: ${error.message}`);
    }
  }

  parseSignalSections(
    gcSummary: string[],
    oven: string[],
    temperature: string[],
    thermalAux1: string[],
    column: string[],
    column1: string[],
    column2: string[],
    front_detector_FID: string[],
    valve1: string[],
    valve2: string[],
    Aux_EPC: string[],
    Valve_Box: string[],
    signals: string[]

  ): object {
    const gcData = {};
    const ovenData = {};
    const tempData = {};
    const thermalAux1_Data = {};
    const tempAux1_data = {};
    const columnData = {
      Column_1: {},
      Column_2: {},
    };
    const FID_data = {};
    const valve1_data = {};
    const valve2_data = {};
    const Aux_EPC_data = {};
    const valve_box_data = {};

    const result = {};
    const gcSummarySplit = gcSummary[0].split('\r\n');
    const ovenSplit = oven[0].split('\r\n');
    const temperatureSplit = temperature[0].split('\r\n');
    const thermalAux1_Split = thermalAux1[0].split('\r\n');
    const column_Split = column[0].split('\r\n');
    const column1_Split = column1[0].split('\r\n');
    const column2_Split = column2[0].split('\r\n');
    const FID_Split = front_detector_FID[0].split('\r\n');
    const valve1_split = valve1[0].split('\r\n');
    const valve2_split = valve2[0].split('\r\n');
    const Aux_EPC_split = Aux_EPC[0].split('\r\n');
    const Valve_Box_split = Valve_Box[0].split('\r\n');




    gcSummarySplit.slice(1, 3).map((item) => {
      const itemSplit = item.split('  ').filter((e) => e != '');
      return (gcData[itemSplit[0].replace(' ', '_').replace(' ', '_').trim()] =
        itemSplit[1].trim());
    });

    ovenSplit.slice(1, 5).map((item) => {
      const itemSplit = item.split('  ').filter((e) => e != '');
      return (ovenData[
        itemSplit[0].replace(' ', '_').replace(' ', '_').trim()
      ] = itemSplit[1].trim());
    });

    temperatureSplit.slice(1, 5).map((item) => {
      const itemSplit = item.split('  ').filter((e) => e != '');
      return (tempData[
        itemSplit[0]
          .replace('(', '')
          .replace(')', '')
          .replace(' ', '_')
          .replace(' ', '_')
          .trim()
      ] = itemSplit[1].trim());
    });

    thermalAux1_Split.slice(2, 5).map((item) => {
      const itemSplit = item.split('  ').filter((e) => e != '');
      return (tempAux1_data[
        itemSplit[0]
          .replace('(', '')
          .replace(')', '')
          .replace(' ', '_')
          .replace(' ', '_')
          .trim()
      ] = itemSplit[1].trim());
    });
    thermalAux1_Data[thermalAux1_Split[1]] = tempAux1_data;

    column_Split.slice(1, 2).map((item) => {
      const itemSplit = item.split('  ').filter((e) => e != '');
      return (columnData[
        itemSplit[0]
          .replace('(', '')
          .replace(')', '')
          .replace(' ', '_')
          .replace(' ', '_')
          .trim()
      ] = itemSplit[1].trim());
    });

    const column1_Data = {
      Location: '',
      Packed: {},
      Pressure: {},
    };
    const packed1_data = {};
    const pressure1_Data = {};

    column1_Split.slice(1, 2).map((item) => {
      const itemSplit = item.split('  ').filter((e) => e != '');
      return (column1_Data[
        itemSplit[0].replace(' ', '_').replace(' ', '_').trim()
      ] = itemSplit[1].trim());
    });
    column1_Data.Location = column1_Split[2].trim();
    column1_Split.slice(3, 4).map((item) => {
      const itemSplit = item.split('  ').filter((e) => e != '');
      return (column1_Data[
        itemSplit[0].replace(' ', '_').replace(' ', '_').trim()
      ] = itemSplit[1].trim());
    });
    column1_Split.slice(5, 8).map((item) => {
      const itemSplit = item.split('  ').filter((e) => e != '');
      return (packed1_data[
        itemSplit[0].replace(' ', '_').replace(' ', '_').trim()
      ] = itemSplit[1].trim());
    });
    column1_Split.slice(9, 12).map((item) => {
      const itemSplit = item.split('  ').filter((e) => e != '');
      return (pressure1_Data[
        itemSplit[0]
          .replace('(', '')
          .replace(')', '')
          .replace(' ', '_')
          .replace(' ', '_')
          .trim()
      ] = itemSplit[1].trim());
    });

    column1_Data.Packed = packed1_data;
    column1_Data.Pressure = pressure1_Data;
    columnData.Column_1 = column1_Data;

    const column2_Data = {
      Location: '',
      Packed: {},
      Pressure: {},
    };
    const packed2_data = {};
    const pressure2_Data = {};
    column2_Split.slice(1, 2).map((item) => {
      const itemSplit = item.split('  ').filter((e) => e != '');
      return (column2_Data[
        itemSplit[0].replace(' ', '_').replace(' ', '_').trim()
      ] = itemSplit[1].trim());
    });
    column2_Data.Location = column2_Split[2].trim();
    column2_Split.slice(3, 4).map((item) => {
      const itemSplit = item.split('  ').filter((e) => e != '');
      return (column2_Data[
        itemSplit[0].replace(' ', '_').replace(' ', '_').trim()
      ] = itemSplit[1].trim());
    });
    column2_Split.slice(5, 8).map((item) => {
      const itemSplit = item.split('  ').filter((e) => e != '');
      return (packed2_data[
        itemSplit[0].replace(' ', '_').replace(' ', '_').trim()
      ] = itemSplit[1].trim());
    });
    column2_Split.slice(9, 12).map((item) => {
      const itemSplit = item.split('  ').filter((e) => e != '');
      return (pressure2_Data[
        itemSplit[0]
          .replace('(', '')
          .replace(')', '')
          .replace(' ', '_')
          .replace(' ', '_')
          .trim()
      ] = itemSplit[1].trim());
    });

    column2_Data.Packed = packed2_data;
    column2_Data.Pressure = pressure2_Data;
    columnData.Column_2 = column2_Data;

    FID_Split.slice(2, 8).map((item) => {
      const itemSplit = item.split('  ').filter((e) => e != '');
      if (itemSplit.length == 2) {
        return (FID_data[
          itemSplit[0].replace(' ', '_').replace(' ', '_').replace(' ', '_').trim()
        ] = itemSplit[1].trim());
      }
      else if(itemSplit.length == 3){
        const data = {
          Status: itemSplit[1].trim(),
          Value:itemSplit[2].trim()
        }
        return (FID_data[
          itemSplit[0].replace(' ', '_').replace(' ', '_').replace(' ', '_').trim()
        ] = data);
      }
    });

    valve1_split.slice(1, 2).map((item) => {
      const itemSplit = item.split('  ').filter((e) => e != '');
      return (valve1_data[
        itemSplit[0].replace(' ', '_').replace(' ', '_').trim()
      ] = itemSplit[1].trim());
    });
    valve2_split.slice(1, 2).map((item) => {
      const itemSplit = item.split('  ').filter((e) => e != '');
      return (valve2_data[
        itemSplit[0].replace(' ', '_').replace(' ', '_').trim()
      ] = itemSplit[1].trim());
    });
    
    const Aux_3_data = {
      Pressure: {},
    }
    Aux_EPC_split.slice(2, 3).map((item) => {
      const itemSplit = item.split('  ').filter((e) => e != '');
      return (Aux_EPC_data[
        itemSplit[0].replace(' ', '_').replace(' ', '_').replace(' ', '_').trim()
      ] = itemSplit[1].trim());
    });
    Aux_EPC_split.slice(5, 6).map((item) => {
      const itemSplit = item.split('  ').filter((e) => e != '');
      return (Aux_EPC_data[
        itemSplit[0].replace(' ', '_').replace(' ', '_').replace(' ', '_').trim()
      ] = itemSplit[1].trim());
    });
    Aux_EPC_split.slice(9, 12).map((item) => {
      const itemSplit = item.split('  ').filter((e) => e != '');
      return (Aux_3_data.Pressure[
        itemSplit[0].replace(' ', '_').replace(' ', '_').replace(' ', '_').trim()
      ] = itemSplit[1].trim());
    });
    Aux_EPC_data[Aux_EPC_split[7].replace(' ', '_').replace(' ', '_').replace(' ', '_').trim()] = Aux_3_data

    Valve_Box_split.slice(1, 2).map((item) => {
      const itemSplit = item.split('  ').filter((e) => e != '');
      return (valve_box_data[
        itemSplit[0].replace(' ', '_').replace(' ', '_').replace(' ', '_').trim()
      ] = itemSplit[1].trim());
    });
    result[gcSummarySplit[0].replace(' ', '_')] = gcData;
    result[ovenSplit[0]] = ovenData;
    result[temperatureSplit[0]] = tempData;
    result[
      thermalAux1_Split[0]
        .replace(' ', '_')
        .replace(' ', '_')
        .replace(' ', '_')
        .replace(' ', '_')
        .replace('(', '')
        .replace(')', '')
    ] = thermalAux1_Data;
    result[column_Split[0]] = columnData;
    result[FID_Split[0].replace('\n', '').replace(' ', '_').replace(' ', '_')] = FID_data
    result[valve1_split[0].replace(' ', '_')] = valve1_data;
    result[valve2_split[0].replace(' ', '_')] = valve2_data;
    result[Aux_EPC_split[0].replace(' ', '_').replace(' ', '_').replace(',', '_').replace(',', '_').replace(',', '_')] = Aux_EPC_data;
    result[Valve_Box_split[0].replace(' ', '_')] = valve_box_data;




    console.log(result);

    return result;
  }
}
