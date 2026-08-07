import { Component } from '@angular/core';
import { HeaderComponent } from './components/header/header';
import { WorkspaceComponent } from './components/workspace/workspace';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [HeaderComponent, WorkspaceComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
}
