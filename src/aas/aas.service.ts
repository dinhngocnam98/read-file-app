import { Injectable } from '@nestjs/common';
import * as fs from 'fs-extra';
import * as iconv from 'iconv-lite';
import * as getWinShortcut from 'get-windows-shortcut-properties';
import { InjectModel } from '@nestjs/mongoose';
import { Aas_report } from 'src/schemas/aas_report.schema';
import { Model } from 'mongoose';

@Injectable()
export class AasService {
  constructor(
    @InjectModel(Aas_report.name) private Aas_reportModel: Model<Aas_report>,
  ) {}
  errorDir: any[] = [];

  async readRoot(dir: string) {
    const rootInfo = fs.readdirSync(dir);
    const rootFilter = rootInfo.filter((item: string) => item.includes('AAS'));
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

  async readFileContents(data: any) {
    console.log(data.device + '->' + data.folder_dir);

    const shortcuts = await this.readShortcuts(data);
    if (shortcuts && shortcuts.length > 0) {
      for (const file of shortcuts) {
        if (
          file.toUpperCase().endsWith('.TXT') &&
          !file.toUpperCase().includes('SAVED')
        ) {
          await this.readAasTXT(data, file);
        } else if(!file.includes('.') || file.toUpperCase().endsWith('.D')) {
          const newFolderPath = {
            folder_dir: data.folder_dir + '/' + file,
            device: data.device,
          };
          await this.readFileContents(newFolderPath);
        }
      }
    }
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

  private async readAasTXT(data: any, file: string) {
    const filePath = `${data.folder_dir}/${file}`;
    const stats = fs.statSync(filePath);
    const contents = await this.extractData(filePath);
    const isSaved = await this.saveAasDb(contents, stats.mtime, data, filePath);
    if (isSaved) {
      const newFile = file
        .toLowerCase()
        .replace('.txt', '_saved.txt')
        .toUpperCase();
      fs.rename(`${data.folder_dir}/${file}`, `${data.folder_dir}/${newFile}`);
    }
  }

  async saveAasDb(contents: any, date: Date, data: any, filePath: string) {
    const result = {
      folder_dir: data.folder_dir,
      file_path: filePath,
      chemical_symbol: contents.chemical_symbol,
      data_lab: contents.data_lab,
      date: date,
    };
    try {
      switch (true) {
        case data.device.toUpperCase().includes('AAS'):
          await this.Aas_reportModel.create(result);
          break;
        default:
          throw new Error('Invalid folder for database');
      }
      return true;
    } catch (err) {
      return false;
    }
  }

  private async extractData(filePath: string) {
    try {
      const fileBuffer = await fs.readFile(filePath, 'utf8');
      return this.parseData(fileBuffer);
    } catch (error) {
      throw new Error(`Error reading or processing the file: ${error.message}`);
    }
  }
  private parseData(contents: string) {
    const parsedData = [];
    const lines = contents
      .trim()
      .split('\n')
      .map((line) => line.trim());
    const nameDataMatch = lines[0];
    const dataRows = lines.slice(1, -1);
    const entries = dataRows.slice(1).map((row) => {
      const rowSplit = row.split('\t').map((value) => value.trim());
      if (rowSplit.find((item) => item.includes('STD-AV'))) {
        if (rowSplit.length === 4) {
          const [Action, SampleId, X, TrueValue] = rowSplit;
          return {
            Action: Action,
            Sample_id: SampleId,
            X: X,
            True_value: parseFloat(TrueValue) || null,
            Conc: null,
            Abs: null,
            SG: '',
            Date: null,
            Time: null,
          };
        } else {
          const [Action, SampleId, X, TrueValue, Conc, Abs, SG, Date, Time] =
            rowSplit;
          return {
            Action: Action,
            Sample_id: SampleId,
            X: X,
            True_value: parseFloat(TrueValue) || null,
            Conc: parseFloat(Conc) || null,
            Abs: parseFloat(Abs) || null,
            SG: SG,
            Date: Date,
            Time: Time,
          };
        }
      } else if (
        rowSplit.find((item) => item.includes('UNK') && item.includes('AV'))
      ) {
        if (rowSplit.length === 7) {
          const [Action, SampleId, X, TrueValue, Conc, Abs, SG] = rowSplit;
          return {
            Action: Action,
            Sample_id: SampleId,
            X: X,
            True_value: parseFloat(TrueValue) || null,
            Conc: parseFloat(Conc) || null,
            Abs: parseFloat(Abs) || null,
            SG: SG,
            Date: null,
            Time: null,
          };
        } else {
          const [Action, SampleId, X, TrueValue, Conc, Abs, SG, Date, Time] =
            rowSplit;
          return {
            Action: Action,
            Sample_id: SampleId,
            X: X,
            True_value: parseFloat(TrueValue) || null,
            Conc: parseFloat(Conc) || null,
            Abs: parseFloat(Abs) || null,
            SG: SG,
            Date: Date,
            Time: Time,
          };
        }
      } else {
        const [Action, SampleId, X, TrueValue, Conc, Abs, SG, Date, Time] =
          rowSplit;
        return {
          Action: Action,
          Sample_id: SampleId,
          X: X,
          True_value: parseFloat(TrueValue) || null,
          Conc: parseFloat(Conc) || null,
          Abs: parseFloat(Abs) || null,
          SG: SG,
          Date: Date,
          Time: Time,
        };
      }
    });
    parsedData.push(...entries);
    return {
      chemical_symbol: nameDataMatch,
      data_lab: parsedData,
    };
  }
}
