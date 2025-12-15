/**
 * 🔱 Tenant Model
 * SaaS展開のためのテナント管理モデル
 * 
 * 階層:
 * - Owner(Tenant) → Sites → Widgets
 * - 1 Founder が複数のサイトを管理可能
 */

/**
 * テナント（顧客）
 */
export interface Tenant {
  id: string;
  ownerUserId: string; // Founder/Dev ユーザーID
  name: string;
  sites: string[]; // サイトIDの配列
  createdAt: Date;
  updatedAt: Date;
}

/**
 * サイト（テナントに属する）
 */
export interface Site {
  id: string;
  tenantId: string;
  url: string;
  name: string;
  siteId: string; // Semantic Index用のサイトID
  widgetCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Widget（サイトに属する）
 */
export interface Widget {
  id: string;
  siteId: string;
  tenantId: string;
  embedCode: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * テナント管理（インメモリ実装、将来はDBに移行）
 */
class TenantManager {
  private tenants: Map<string, Tenant> = new Map();
  private sites: Map<string, Site> = new Map();
  private widgets: Map<string, Widget> = new Map();

  /**
   * テナントを作成
   */
  createTenant(ownerUserId: string, name: string): Tenant {
    const tenant: Tenant = {
      id: `tenant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ownerUserId,
      name,
      sites: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.tenants.set(tenant.id, tenant);
    return tenant;
  }

  /**
   * テナントを取得
   */
  getTenant(tenantId: string): Tenant | undefined {
    return this.tenants.get(tenantId);
  }

  /**
   * ユーザーIDからテナントを取得
   */
  getTenantByUserId(userId: string): Tenant | undefined {
    for (const tenant of this.tenants.values()) {
      if (tenant.ownerUserId === userId) {
        return tenant;
      }
    }
    return undefined;
  }

  /**
   * サイトを作成
   */
  createSite(tenantId: string, url: string, name: string, siteId: string): Site {
    const site: Site = {
      id: `site-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      url,
      name,
      siteId,
      widgetCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.sites.set(site.id, site);

    // テナントにサイトを追加
    const tenant = this.tenants.get(tenantId);
    if (tenant) {
      tenant.sites.push(site.id);
      tenant.updatedAt = new Date();
    }

    return site;
  }

  /**
   * サイトを取得
   */
  getSite(siteId: string): Site | undefined {
    return this.sites.get(siteId);
  }

  /**
   * テナントのサイト一覧を取得
   */
  getTenantSites(tenantId: string): Site[] {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      return [];
    }

    return tenant.sites
      .map((siteId) => this.sites.get(siteId))
      .filter((site): site is Site => site !== undefined);
  }

  /**
   * Widgetを作成
   */
  createWidget(siteId: string, tenantId: string): Widget {
    const widget: Widget = {
      id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      siteId,
      tenantId,
      embedCode: `<script src="https://cdn.tenmon-ark.com/widget/embed.min.js"></script>\n<script>createTenmonWidget({siteId:"${siteId}",selector:"#widget-container"});</script>`,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.widgets.set(widget.id, widget);

    // サイトのWidget数を更新
    const site = this.sites.get(siteId);
    if (site) {
      site.widgetCount++;
      site.updatedAt = new Date();
    }

    return widget;
  }

  /**
   * Widgetを取得
   */
  getWidget(widgetId: string): Widget | undefined {
    return this.widgets.get(widgetId);
  }

  /**
   * テナントのWidget一覧を取得
   */
  getTenantWidgets(tenantId: string): Widget[] {
    const widgets: Widget[] = [];
    for (const widget of this.widgets.values()) {
      if (widget.tenantId === tenantId) {
        widgets.push(widget);
      }
    }
    return widgets;
  }
}

// シングルトンインスタンス
export const tenantManager = new TenantManager();

