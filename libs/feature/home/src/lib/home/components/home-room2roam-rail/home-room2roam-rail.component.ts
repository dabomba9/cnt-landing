import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ARTICLES, CATEGORY_META, EDITOR_PICK_IDS, IArticle } from '@cnt-workspace/content';

/** Room2Roam editorial rail rendered on the home page (P26/A).
 *  Owned by its own component so the @cnt-workspace/content barrel
 *  (which carries 46 article bodies, several MB of HTML) stays out
 *  of the home eager bundle. Home defers this component via
 *  `@defer (on viewport)`, so the chunk is fetched only when the
 *  visitor scrolls down to it. */
@Component({
  selector: 'cnt-home-room2roam-rail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home-room2roam-rail.component.html',
})
export class HomeRoom2roamRailComponent {
  readonly CATEGORY_META = CATEGORY_META;
  readonly featured: IArticle | null = ARTICLES[0] ?? null;
  readonly picks: IArticle[] = (() => {
    const featuredId = ARTICLES[0]?.id;
    return EDITOR_PICK_IDS
      .filter(id => id !== featuredId)
      .map(id => ARTICLES.find(a => a.id === id))
      .filter((a): a is IArticle => !!a)
      .slice(0, 3);
  })();
}
