import { Module } from '@nestjs/common';
import { AasService } from './aas.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Aas_report, Aas_reportSchema } from 'src/schemas/aas_report.schema';
import { Subject, debounceTime } from 'rxjs';
import { watcherChokidar } from 'src/common/watcher';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Aas_report.name,
        schema: Aas_reportSchema,
      },
    ]),
  ],
  providers: [AasService, watcherChokidar],
})
export class AasModule {
  constructor(
    private aasService: AasService,
    private watcherChokidar: watcherChokidar,
  ) {}

  async onApplicationBootstrap() {
    const rootDir = 'D:/root';

    const folderPaths = await this.aasService.readRoot(rootDir);
    // const folderPaths = [{ folder_dir: 'R:/test', device: 'MAY AAS' }];
    const promises = [];
    folderPaths.forEach((item: any) => {
      const promise = this.aasService.readFileContents(item);
      promises.push(promise);
    });
    await Promise.all(promises)
      .then(() => console.log('All shortcuts had read!'))
      .catch((error) => console.error(error));

    const eventSubject = new Subject();
    folderPaths.forEach((data: any) => {
      this.watcherChokidar.watcherChokidar(data);
    });

    this.watcherChokidar.watchers.forEach((data: any) => {
      data.watcher.on('addDir', (path: string) => {
        eventSubject.next({ event: 'addDir', path: path, device: data.device });
      });
    });

    eventSubject.pipe(debounceTime(1000)).subscribe((event: any) => {
      const pathEdit = event.path.replace(/\\/g, '/');
      this.aasService.readFileContents({
        folder_dir: pathEdit,
        device: event.device,
      });
    });

    const intervalInMilliseconds = 15 * 60 * 1000;
    setInterval(async () => {
      const promisesErrorDir = [];

      if (this.watcherChokidar.errorFolderWatchers.length > 0) {
        console.log(
          'errorFolderWatchers',
          this.watcherChokidar.errorFolderWatchers,
        );
        this.watcherChokidar.errorFolderWatchers.forEach((data) => {
          this.watcherChokidar.watcherChokidar(data);
        });
      }
      if (this.aasService.errorDir.length > 0) {
        console.log('errorDir', this.aasService.errorDir);
        this.aasService.errorDir.forEach((data) => {
          const promise = this.aasService.readFileContents(data);
          promisesErrorDir.push(promise);
        });
        await Promise.all(promisesErrorDir).catch((error) =>
          console.error(error),
        );
      }
    }, intervalInMilliseconds);
  }
}
