import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs-extra';
import * as iconv from 'iconv-lite';
import * as getWinShortcut from 'get-windows-shortcut-properties';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Gc3_report } from '../schemas/gc3_report.schema';

@Injectable()
export class Gc3Service {
  constructor(
    @InjectModel(Gc3_report.name) private Gc3_reportModel: Model<Gc3_report>,
  ) {}

  errorDir: any[] = [];
  logger = new Logger('MAY GC 3');

  async readFileContents(data: any) {
    this.logger.log('Read folder: ' + data.folder_dir);
    if (data.folder_dir.toUpperCase().endsWith('.TXT')) {
      const lastSlashIndex = data.folder_dir.lastIndexOf('/');
      const directoryUrl =
        lastSlashIndex !== -1
          ? data.folder_dir.substring(0, lastSlashIndex)
          : data.folder_dir;
      const file =
        lastSlashIndex !== -1
          ? data.folder_dir.substring(lastSlashIndex + 1)
          : '';
      const newData = {
        folder_dir: directoryUrl,
        device: data.device,
      };
      if (
        file.toUpperCase().endsWith('.TXT') &&
        file.toUpperCase().includes('REPORT') &&
        !file.toUpperCase().includes('IRREPORT') &&
        !file.toUpperCase().includes('SAVED')
      ) {
        await this.readReport(newData, file);
      }
    }
    else{
      const shortcuts = await this.readShortcuts(data);
      if (shortcuts && shortcuts.length > 0) {
        for (const file of shortcuts) {
          if (
            file.toUpperCase().endsWith('.TXT') &&
            file.toUpperCase().includes('REPORT') &&
            !file.toUpperCase().includes('IRREPORT') &&
            !file.toUpperCase().includes('SAVED')
          ) {
            await this.readReport(data, file);
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
  }

  async readRoot(dir: string) {
    const rootInfo = fs.readdirSync(dir);
    const rootFilter = rootInfo.filter((item) => item.includes('GC 3'));
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
    const stats = fs.statSync(filePath);
    const isSaved = await this.saveReportDb(contents, stats.mtime, data);
    if (isSaved) {
      const newFile = file
        .toLowerCase()
        .replace('.txt', '_saved.txt')
        .toUpperCase();
      fs.rename(`${data.folder_dir}/${file}`, `${data.folder_dir}/${newFile}`);
    }
  }

  // Lưu dữ liệu vào database
  async saveReportDb(contents: any[], date: Date, data: any) {
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
      date: date,
    };
    try {
      switch (true) {
        case data.device.toUpperCase().includes('GC 3'):
          await this.Gc3_reportModel.findOneAndUpdate({folder_dir: result.folder_dir}, result,{new: true, upsert: true});
          this.logger.log('Saved to Database')
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
  async extractSignalData(filePath: string): Promise<any[]> {
    try {
      const fileBuffer = await fs.readFile(filePath);
      // Convert the file buffer from UTF-16 LE with BOM to UTF-8
      const fileContent = iconv.decode(fileBuffer, 'utf16-le');
      // Extract "Signal" sections
      const signalSections = fileContent.match(/Signal \d+:.+?(Totals :.+?)/gs);
      if (signalSections) {
        return this.parseSignalSections(signalSections);
      } else {
        throw new Error(
          `Signal data not found in the provided text. direct: ${filePath}`,
        );
      }
    } catch (error) {
      throw new Error(`Error reading or processing the file: ${error.message}`);
    }
  }

  parseSignalSections(signalSections: string[]): object[] {
    const parsedData = [];

    for (const signal of signalSections) {
      const lines = signal
        .trim()
        .split('\n')
        .map((line) => line.trim());

      // Extract name_signal
      const nameSignalMatch = lines[0];
      const name_signal = nameSignalMatch ? nameSignalMatch : '';

      // Extract dataRows
      const dataRows = lines.slice(4, -1);
      const signalEntries = dataRows.slice(1).map((row) => {
        const rowSplit = row.split(/\s+/).map((value) => value.trim());
        if (rowSplit.length === 6) {
          const [RetTime, type, Area, Amt_Area, Norm, Name] = rowSplit;
          return {
            name_signal,
            RetTime: parseFloat(RetTime) || null,
            type,
            Area: parseFloat(Area) || null,
            Amt_Area: parseFloat(Amt_Area) || null,
            Norm: parseFloat(Norm) || null,
            Grp: '',
            Name,
          };
        } else {
          const [RetTime, Area, Amt_Area, Norm, Name] = rowSplit;
          return {
            name_signal,
            RetTime: parseFloat(RetTime) || null,
            type: null,
            Area: parseFloat(Area) || null,
            Amt_Area: parseFloat(Amt_Area) || null,
            Norm: parseFloat(Norm) || null,
            Grp: '',
            Name,
          };
        }
      });

      // const totals_norm = lines[lines.length - 1].match(/Totals\s+:\s+(\S+)/);
      // console.log(totals_norm);
      // signalEntries.push({ totals_norm: parseFloat(totals_norm) || 0 });

      parsedData.push(...signalEntries);
    }

    return parsedData;
  }
}
