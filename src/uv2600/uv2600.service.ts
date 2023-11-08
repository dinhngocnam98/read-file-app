import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import * as fs from 'fs-extra';
import * as getWinShortcut from 'get-windows-shortcut-properties';
import { Uv2600_report } from 'src/schemas/uv2600_report.schema';

@Injectable()
export class Uv2600Service {
  constructor(
    @InjectModel(Uv2600_report.name)
    private Uv2600_reportModel: Model<Uv2600_report>,
  ) {}
  errorDir: any[] = [];

  async readRoot(dir: string) {
    const rootInfo = fs.readdirSync(dir);
    const rootFilter = rootInfo.filter((item: string) =>
      item.includes('UV 2600'),
    );
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
    const shortcuts = await this.readShortcuts(data);
    if (shortcuts && shortcuts.length > 0) {
      for (const file of shortcuts) {
        if (
          file.toUpperCase().endsWith('.TXT') &&
          !file.toUpperCase().includes('SAVED')
        ) {
          await this.readUv1800TXT(data, file);
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

  private async readUv1800TXT(data: any, file: string) {
    const filePath = `${data.folder_dir}/${file}`;
    const contents = await this.extractData(filePath);
    const stats = fs.statSync(filePath);
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
      data_lab: contents.data_lab,
      date: date,
    };
    try {
      switch (true) {
        case data.device.toUpperCase().includes('UV 2600'):
          await this.Uv2600_reportModel.create(result);
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

    const header = lines[0].split(',');
    const name = header[header.length - 2].replace(/"/g, '').trim();
    const nameProp = name.replace('.0', '');

    const entries = lines.slice(1).map((row) => {
      const rowSplit = row
        .split(',')
        .map((value) => value.replace(/"/g, '').trim());

      const [SampleId, Type, Conc, value, Comments] = rowSplit;
      const result = {
        Sample_id: SampleId,
        Type: Type,
        Conc: parseFloat(Conc) || null,
        Name: name,
        Comments: Comments,
      };
      result[nameProp] = value;

      return result;
    });
    parsedData.push(...entries);
    return {
      data_lab: parsedData,
    };
  }
}
