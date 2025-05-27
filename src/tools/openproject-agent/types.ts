// OpenProject API Types
// Based on OpenProject API v3 documentation

export interface OpenProjectHalResource {
  _type: string;
  _links: {
    self: {
      href: string;
      title?: string;
    };
    [key: string]: any;
  };
}

export interface OpenProjectUser extends OpenProjectHalResource {
  _type: "User";
  id: number;
  login: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  admin: boolean;
  avatar: string;
  status: "active" | "registered" | "locked" | "invited";
  language: string;
  createdAt: string;
  updatedAt: string;
}

export interface OpenProjectProject extends OpenProjectHalResource {
  _type: "Project";
  id: number;
  identifier: string;
  name: string;
  description: {
    format: "markdown" | "textile" | "plain";
    raw: string;
    html: string;
  };
  homepage: string;
  public: boolean;
  active: boolean;
  statusExplanation: {
    format: "markdown" | "textile" | "plain";
    raw: string;
    html: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface OpenProjectWorkPackage extends OpenProjectHalResource {
  _type: "WorkPackage";
  id: number;
  lockVersion: number;
  subject: string;
  description: {
    format: "markdown" | "textile" | "plain";
    raw: string;
    html: string;
  };
  scheduleManually: boolean;
  readonly: boolean;
  startDate?: string;
  dueDate?: string;
  derivedStartDate?: string;
  derivedDueDate?: string;
  estimatedTime?: string;
  spentTime?: string;
  percentageDone: number;
  createdAt: string;
  updatedAt: string;
  _links: {
    self: { href: string };
    update?: { href: string; method: "patch" };
    updateImmediately?: { href: string; method: "patch" };
    delete?: { href: string; method: "delete" };
    project: { href: string; title: string };
    type: { href: string; title: string };
    status: { href: string; title: string };
    author: { href: string; title: string };
    assignee?: { href: string; title: string };
    responsible?: { href: string; title: string };
    priority: { href: string; title: string };
    category?: { href: string; title: string };
    version?: { href: string; title: string };
    parent?: { href: string; title: string };
    [key: string]: any;
  };
}

export interface OpenProjectType extends OpenProjectHalResource {
  _type: "Type";
  id: number;
  name: string;
  color: string;
  position: number;
  isDefault: boolean;
  isMilestone: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OpenProjectStatus extends OpenProjectHalResource {
  _type: "Status";
  id: number;
  name: string;
  isClosed: boolean;
  color: string;
  isDefault: boolean;
  isReadonly: boolean;
  defaultDoneRatio?: number;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface OpenProjectPriority extends OpenProjectHalResource {
  _type: "Priority";
  id: number;
  name: string;
  color: string;
  position: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Collection response wrapper
export interface OpenProjectCollection<T> {
  _type: "Collection";
  total: number;
  count: number;
  pageSize: number;
  offset: number;
  _embedded: {
    elements: T[];
  };
  _links: {
    self: { href: string };
    jumpTo?: { href: string; templated: boolean };
    changeSize?: { href: string; templated: boolean };
    nextByOffset?: { href: string };
    previousByOffset?: { href: string };
  };
}

// Request/Response types for operations
export interface CreateWorkPackageRequest {
  subject: string;
  description?: {
    format?: "markdown" | "textile" | "plain";
    raw: string;
  };
  _links: {
    project: { href: string };
    type: { href: string };
    status?: { href: string };
    priority?: { href: string };
    assignee?: { href: string };
    responsible?: { href: string };
  };
  startDate?: string;
  dueDate?: string;
  estimatedTime?: string;
  percentageDone?: number;
}

export interface UpdateWorkPackageRequest {
  lockVersion: number;
  subject?: string;
  description?: {
    format?: "markdown" | "textile" | "plain";
    raw: string;
  };
  _links?: {
    type?: { href: string };
    status?: { href: string };
    priority?: { href: string };
    assignee?: { href: string };
    responsible?: { href: string };
  };
  startDate?: string;
  dueDate?: string;
  estimatedTime?: string;
  percentageDone?: number;
}

// Filter parameters for work packages
export interface WorkPackageFilters {
  project?: string | string[];
  assignee?: string | string[];
  responsible?: string | string[];
  type?: string | string[];
  status?: string | string[];
  priority?: string | string[];
  author?: string | string[];
  subject?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  startDate?: string;
  dueDate?: string;
  estimatedTime?: string;
  spentTime?: string;
  percentageDone?: string;
  [key: string]: any;
} 