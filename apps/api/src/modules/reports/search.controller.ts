import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { RequestUser } from "../../shared/http.types";
import { SearchService } from "./search.service";

@UseGuards(AuthGuard)
@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(@CurrentUser() user: RequestUser, @Query("q") query?: string) {
    return this.searchService.search(user, query);
  }
}
