import os
import re

controllers = [
    "src/modules/users/users.controller.ts",
    "src/modules/tasks/tasks.controller.ts",
    "src/modules/projects/projects.controller.ts",
    "src/modules/escalations/escalations.controller.ts",
    "src/modules/evidence/evidence.controller.ts",
]

for file_path in controllers:
    with open(file_path, "r") as f:
        content = f.read()
    
    # Add imports if missing
    if "ApiResponse" not in content or "ApiHeader" not in content:
        content = re.sub(
            r"import \{([^}]+)\} from '@nestjs/swagger';",
            lambda m: f"import {{{m.group(1).replace('ApiResponse,', '').replace('ApiHeader,', '').strip()}{', ApiResponse' if 'ApiResponse' not in m.group(1) else ''}{', ApiHeader' if 'ApiHeader' not in m.group(1) else ''}}} from '@nestjs/swagger';",
            content
        )
        if "ApiResponse" not in content: # If not updated by the above regex
             content = content.replace("import { ApiTags, ApiOperation } from '@nestjs/swagger';", "import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';")
             
    # Find all methods
    # A method starts after @ApiOperation, possibly @Roles, and has @Get, @Post, etc.
    
    # regex to find @ApiOperation({ summary: '...' })
    # and insert @ApiResponse and @ApiHeader right after
    def replace_method(match):
        method_type = match.group(1) # Get, Post, Patch, Delete
        summary = match.group(2)
        
        status = 201 if "Post" in method_type else 200
        desc = "Successfully created." if "Post" in method_type else "Success."
        
        # Check if already has ApiResponse
        if "ApiResponse" in match.group(0)[len(match.group(1)):]:
             return match.group(0)
             
        # Add the decorators
        additions = f"\n  @ApiResponse({{ status: {status}, description: '{desc}' }})\n  @ApiHeader({{ name: 'x-user-role', required: true }})"
        return match.group(0) + additions

    # We can match @ApiOperation(...) and append to it
    content = re.sub(
        r"(@(Get|Post|Patch|Delete)[^\n]*\n(?:[ \t]*@Roles[^\n]*\n)?(?:[ \t]*@ApiOperation[^\n]*))",
        replace_method,
        content
    )
    
    # Alternatively, just find @ApiOperation(...) and append to it:
    # content = re.sub(r"(@ApiOperation\(\{ summary: '([^']+)' \}\))", lambda m: f"{m.group(1)}\n  @ApiResponse({{ status: 200, description: 'Successful operation.' }})\n  @ApiHeader({{ name: 'x-user-role', required: true }})", content)

    # Let's use a simpler regex
    content = re.sub(r"([ \t]*@ApiOperation\(\{ summary: '[^']+' \}\))", lambda m: f"{m.group(1)}\n  @ApiResponse({{ status: 200, description: 'Successful operation.' }})\n  @ApiHeader({{ name: 'x-user-role', required: true, description: 'Role-Based Access Control' }})", content)
    # Fix the status 201 for POST
    content = re.sub(r"(@Post\([^\)]*\)\n(?:[ \t]*@Roles[^\n]*\n)?(?:[ \t]*@ApiOperation[^\n]*\n)[ \t]*@ApiResponse\(\{ status: )200", r"\1201", content)
    
    with open(file_path, "w") as f:
        f.write(content)
