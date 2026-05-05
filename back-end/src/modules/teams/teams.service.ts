import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService, Team } from '../../core/database/database.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

@Injectable()
export class TeamsService {
  constructor(private readonly db: DatabaseService) {}

  findAll(): Team[] {
    return this.db.teams;
  }

  findOne(id: number): Team {
    const team = this.db.teams.find(t => t.team_id === id);
    if (!team) throw new NotFoundException(`Team with ID ${id} not found`);
    return team;
  }

  create(dto: CreateTeamDto): Team {
    const newTeam: Team = {
      team_id: this.db.teams.length ? Math.max(...this.db.teams.map(t => t.team_id)) + 1 : 1,
      team_name: dto.team_name,
      department_id: dto.department_id,
      created_at: new Date().toISOString(),
    };
    this.db.teams.push(newTeam);
    return newTeam;
  }

  update(id: number, dto: UpdateTeamDto): Team {
    const index = this.db.teams.findIndex(t => t.team_id === id);
    if (index === -1) throw new NotFoundException(`Team with ID ${id} not found`);
    this.db.teams[index] = { ...this.db.teams[index], ...dto };
    return this.db.teams[index];
  }

  remove(id: number): void {
    const index = this.db.teams.findIndex(t => t.team_id === id);
    if (index === -1) throw new NotFoundException(`Team with ID ${id} not found`);
    this.db.teams.splice(index, 1);
  }
}
