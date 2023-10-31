import { Module } from '@nestjs/common';
import { ReadReportService } from './read-report.service';
import { MongooseModule } from '@nestjs/mongoose';
import * as chokidar from 'chokidar';
import { Gc5_report, Gc5_reportSchema } from '../schemas/gc5_report.schema';
import { Gc4_report, Gc4_reportSchema } from '../schemas/gc4_report.schema';
import { Gc3_report, Gc3_reportSchema } from '../schemas/gc3_report.schema';
import { Gc2_report, Gc2_reportSchema } from '../schemas/gc2_report.schema';
import { Gc1_report, Gc1_reportSchema } from '../schemas/gc1_report.schema';
import {
  Uv1800_report,
  Uv1800_reportSchema,
} from '../schemas/uv1800_report.schema';
import {
  Uv2600_report,
  Uv2600_reportSchema,
} from '../schemas/uv2600_report.schema';
import { Aas_report, Aas_reportSchema } from '../schemas/aas_report.schema';
import { Hplc_report, Hplc_reportSchema } from '../schemas/hplc_report.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Gc5_report.name,
        schema: Gc5_reportSchema,
      },
      {
        name: Gc4_report.name,
        schema: Gc4_reportSchema,
      },
      {
        name: Gc3_report.name,
        schema: Gc3_reportSchema,
      },
      {
        name: Gc2_report.name,
        schema: Gc2_reportSchema,
      },

      {
        name: Gc1_report.name,
        schema: Gc1_reportSchema,
      },
      {
        name: Uv1800_report.name,
        schema: Uv1800_reportSchema,
      },
      {
        name: Uv2600_report.name,
        schema: Uv2600_reportSchema,
      },
      {
        name: Aas_report.name,
        schema: Aas_reportSchema,
      },
      {
        name: Hplc_report.name,
        schema: Hplc_reportSchema,
      },
    ]),
  ],
  providers: [ReadReportService],
})
export class ReadReportModule {
  constructor(private reportService: ReadReportService) {}
  async onApplicationBootstrap() {
    // const rootDir = ['../testTxT'];
    const rootDir = 'D:/root';

    const folderPaths = await this.reportService.readRoot(rootDir);
    
    const promises = [];
    folderPaths.forEach((folderPath) => {
      const promise = this.reportService.readFileContents(folderPath);
      promises.push(promise);
    });
    await Promise.all(promises)
      .then(() => console.log('All shortcuts had read!'))
      .catch((error) => console.error(error));

    // Theo dõi sự thay đổi trong thư mục và cập nhật nội dung của các tệp tin .txt
    const watchers = [];
    const errorFolderWatchers = [];
    const watcherChokidar = (folderPath: string) => {
      const watcher = chokidar.watch(folderPath, {
        persistent: true,
        usePolling: true,
        ignoreInitial: true,
      });

      watcher.on('error', (error) => {
        watcher.close();

        const errorFolderIndex = errorFolderWatchers.indexOf(folderPath);
        if (errorFolderIndex === -1) {
          errorFolderWatchers.push(folderPath);
        }
        const watchersIndex = watchers.indexOf(watcher);
        if (watchersIndex !== -1) {
          watchers.splice(watchersIndex, 1);
        }
      });
      watchers.push(watcher);
    };
    folderPaths.forEach((folderPath: string) => {
      watcherChokidar(folderPath);
    });

    watchers.forEach((watcher) => {
      watcher.on('addDir', async (path: string) => {
        const pathEdit = path.replace(/\\/g, '/').replace(':', ':/');
        await this.reportService.readFileContents(pathEdit);
      });
    });

    // //Doc lai file loi
    const intervalInMilliseconds = 15 * 60 * 1000;
    setInterval(async () => {
      const promisesErrorDir = [];

      if (errorFolderWatchers.length > 0) {
        console.log('errorFolderWatchers', errorFolderWatchers);
        errorFolderWatchers.forEach((folderPath) => {
          watcherChokidar(folderPath);
        });
      }
      if (this.reportService.errorDir.length > 0) {
        console.log('errorDir', this.reportService.errorDir);
        this.reportService.errorDir.forEach((folderPath) => {
          const promise = this.reportService.readFileContents(folderPath);
          promisesErrorDir.push(promise);
        });
        await Promise.all(promisesErrorDir).catch((error) =>
          console.error(error),
        );
      }
    }, intervalInMilliseconds);
  }
}
