/**
 * GraphQL Query Utilities for Shopify CLI
 * 
 * This module provides optimized GraphQL queries and mutations for bulk operations,
 * reducing API calls and improving performance for large datasets.
 */

export interface GraphQLVariables {
  [key: string]: any;
}

export interface GraphQLQuery {
  query: string;
  variables?: GraphQLVariables;
}

export interface BulkOperationResult {
  id: string;
  status: 'CREATED' | 'RUNNING' | 'COMPLETED' | 'CANCELING' | 'CANCELED' | 'FAILED';
  errorCode?: string;
  createdAt: string;
  completedAt?: string;
  objectCount?: number;
  fileSize?: number;
  url?: string;
  partialDataUrl?: string;
}

/**
 * GraphQL queries for bulk product operations
 */
export const BULK_PRODUCT_QUERIES = {
  /**
   * Bulk query to get all products with selected fields
   */
  BULK_PRODUCTS: `
    mutation bulkOperationRunQuery($query: String!) {
      bulkOperationRunQuery(query: $query) {
        bulkOperation {
          id
          status
          errorCode
          createdAt
          objectCount
          fileSize
          url
          partialDataUrl
        }
        userErrors {
          field
          message
        }
      }
    }
  `,

  /**
   * Check bulk operation status
   */
  BULK_OPERATION_STATUS: `
    query getCurrentBulkOperation {
      currentBulkOperation {
        id
        status
        errorCode
        createdAt
        completedAt
        objectCount
        fileSize
        url
        partialDataUrl
      }
    }
  `,

  /**
   * Cancel running bulk operation
   */
  BULK_OPERATION_CANCEL: `
    mutation bulkOperationCancel($id: ID!) {
      bulkOperationCancel(id: $id) {
        bulkOperation {
          id
          status
        }
        userErrors {
          field
          message
        }
      }
    }
  `,

  /**
   * Get products by IDs with full details
   */
  PRODUCTS_BY_IDS: `
    query getProductsByIds($ids: [ID!]!) {
      nodes(ids: $ids) {
        ... on Product {
          id
          title
          handle
          status
          vendor
          productType
          tags
          createdAt
          updatedAt
          variants(first: 10) {
            nodes {
              id
              title
              sku
              price
              inventoryQuantity
              inventoryItem {
                id
              }
            }
          }
        }
      }
    }
  `,

  /**
   * Bulk update products using product input
   */
  BULK_PRODUCT_UPDATE: `
    mutation productBulkUpdate($productBulkInput: ProductBulkInput!) {
      productBulkUpdate(productBulkInput: $productBulkInput) {
        job {
          id
          done
        }
        userErrors {
          field
          message
        }
      }
    }
  `,
};

/**
 * GraphQL queries for inventory operations
 */
export const BULK_INVENTORY_QUERIES = {
  /**
   * Bulk inventory adjustment
   */
  BULK_INVENTORY_ADJUST: `
    mutation inventoryBulkAdjustQuantityAtLocation($inventoryItemAdjustments: [InventoryAdjustItemInput!]!, $locationId: ID!) {
      inventoryBulkAdjustQuantityAtLocation(inventoryItemAdjustments: $inventoryItemAdjustments, locationId: $locationId) {
        inventoryLevels {
          id
          available
          item {
            id
            sku
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `,

  /**
   * Get inventory levels for multiple items
   */
  INVENTORY_LEVELS: `
    query getInventoryLevels($locationIds: [ID!], $inventoryItemIds: [ID!]) {
      inventoryLevels(first: 250, locationIds: $locationIds, inventoryItemIds: $inventoryItemIds) {
        nodes {
          id
          available
          location {
            id
            name
          }
          item {
            id
            sku
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `,
};

/**
 * GraphQL queries for order operations
 */
export const BULK_ORDER_QUERIES = {
  /**
   * Get orders with filtering
   */
  ORDERS_BULK: `
    query getOrdersBulk($query: String!) {
      orders(first: 250, query: $query) {
        nodes {
          id
          name
          email
          phone
          createdAt
          updatedAt
          processedAt
          cancelledAt
          totalPrice
          subtotalPrice
          totalTax
          financialStatus
          fulfillmentStatus
          customer {
            id
            email
            firstName
            lastName
          }
          shippingAddress {
            firstName
            lastName
            address1
            city
            province
            country
            zip
          }
          lineItems(first: 10) {
            nodes {
              id
              title
              quantity
              variant {
                id
                product {
                  id
                  title
                }
              }
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `,
};

/**
 * Utility class for building GraphQL queries
 */
export class GraphQLQueryBuilder {
  /**
   * Build a bulk products query string for JSONL export
   */
  static buildBulkProductsQuery(options: {
    fields?: string[];
    filters?: {
      status?: string;
      vendor?: string;
      productType?: string;
      createdAt?: { min?: string; max?: string };
      updatedAt?: { min?: string; max?: string };
    };
  } = {}): string {
    const { fields = ['id', 'title', 'handle', 'status', 'vendor', 'productType'], filters = {} } = options;

    let query = 'products';
    const conditions: string[] = [];

    // Apply filters
    if (filters.status) {
      conditions.push(`status:${filters.status}`);
    }
    if (filters.vendor) {
      conditions.push(`vendor:"${filters.vendor}"`);
    }
    if (filters.productType) {
      conditions.push(`product_type:"${filters.productType}"`);
    }
    if (filters.createdAt?.min) {
      conditions.push(`created_at:>='${filters.createdAt.min}'`);
    }
    if (filters.createdAt?.max) {
      conditions.push(`created_at:<='${filters.createdAt.max}'`);
    }
    if (filters.updatedAt?.min) {
      conditions.push(`updated_at:>='${filters.updatedAt.min}'`);
    }
    if (filters.updatedAt?.max) {
      conditions.push(`updated_at:<='${filters.updatedAt.max}'`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Build field selection
    const fieldSelection = fields.join('\\n        ');

    return `
      {
        products {
          edges {
            node {
              ${fieldSelection}
              variants(first: 5) {
                edges {
                  node {
                    id
                    title
                    sku
                    price
                    inventoryQuantity
                  }
                }
              }
            }
          }
        }
      }
    `;
  }

  /**
   * Build a products by IDs query
   */
  static buildProductsByIdsQuery(productIds: string[], fields?: string[]): GraphQLQuery {
    const selectedFields = fields || [
      'id', 'title', 'handle', 'status', 'vendor', 'productType', 'tags', 'createdAt', 'updatedAt'
    ];

    return {
      query: `
        query getProductsByIds($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on Product {
              ${selectedFields.join('\n              ')}
              variants(first: 10) {
                nodes {
                  id
                  title
                  sku
                  price
                  inventoryQuantity
                  inventoryItem {
                    id
                  }
                }
              }
            }
          }
        }
      `,
      variables: {
        ids: productIds.map(id => `gid://shopify/Product/${id}`),
      },
    };
  }

  /**
   * Build inventory levels query
   */
  static buildInventoryLevelsQuery(inventoryItemIds: string[], locationIds?: string[]): GraphQLQuery {
    return {
      query: BULK_INVENTORY_QUERIES.INVENTORY_LEVELS,
      variables: {
        inventoryItemIds: inventoryItemIds.map(id => `gid://shopify/InventoryItem/${id}`),
        locationIds: locationIds?.map(id => `gid://shopify/Location/${id}`),
      },
    };
  }

  /**
   * Build bulk inventory adjustment mutation
   */
  static buildBulkInventoryAdjustment(
    adjustments: Array<{ inventoryItemId: string; quantity: number }>,
    locationId: string
  ): GraphQLQuery {
    return {
      query: BULK_INVENTORY_QUERIES.BULK_INVENTORY_ADJUST,
      variables: {
        locationId: `gid://shopify/Location/${locationId}`,
        inventoryItemAdjustments: adjustments.map(adj => ({
          inventoryItemId: `gid://shopify/InventoryItem/${adj.inventoryItemId}`,
          availableDelta: adj.quantity,
        })),
      },
    };
  }

  /**
   * Build orders query with filters
   */
  static buildOrdersQuery(options: {
    status?: string;
    financialStatus?: string;
    fulfillmentStatus?: string;
    createdAt?: { min?: string; max?: string };
    processedAt?: { min?: string; max?: string };
  } = {}): GraphQLQuery {
    const conditions: string[] = [];

    if (options.status) {
      conditions.push(`status:${options.status}`);
    }
    if (options.financialStatus) {
      conditions.push(`financial_status:${options.financialStatus}`);
    }
    if (options.fulfillmentStatus) {
      conditions.push(`fulfillment_status:${options.fulfillmentStatus}`);
    }
    if (options.createdAt?.min) {
      conditions.push(`created_at:>='${options.createdAt.min}'`);
    }
    if (options.createdAt?.max) {
      conditions.push(`created_at:<='${options.createdAt.max}'`);
    }
    if (options.processedAt?.min) {
      conditions.push(`processed_at:>='${options.processedAt.min}'`);
    }
    if (options.processedAt?.max) {
      conditions.push(`processed_at:<='${options.processedAt.max}'`);
    }

    const queryString = conditions.length > 0 ? conditions.join(' AND ') : '';

    return {
      query: BULK_ORDER_QUERIES.ORDERS_BULK,
      variables: {
        query: queryString,
      },
    };
  }
}

/**
 * Utility functions for working with GraphQL IDs
 */
export class GraphQLIdUtils {
  /**
   * Convert REST API ID to GraphQL Global ID
   */
  static toGraphQLId(restId: string | number, resourceType: string): string {
    return `gid://shopify/${resourceType}/${restId}`;
  }

  /**
   * Extract REST API ID from GraphQL Global ID
   */
  static fromGraphQLId(graphqlId: string): string {
    return graphqlId.split('/').pop() || '';
  }

  /**
   * Get resource type from GraphQL Global ID
   */
  static getResourceType(graphqlId: string): string {
    const parts = graphqlId.split('/');
    return parts.length > 2 ? parts[parts.length - 2] : '';
  }

  /**
   * Convert multiple REST IDs to GraphQL IDs
   */
  static toGraphQLIds(restIds: Array<string | number>, resourceType: string): string[] {
    return restIds.map(id => this.toGraphQLId(id, resourceType));
  }

  /**
   * Convert multiple GraphQL IDs to REST IDs
   */
  static fromGraphQLIds(graphqlIds: string[]): string[] {
    return graphqlIds.map(id => this.fromGraphQLId(id));
  }
}

/**
 * Pagination helper for GraphQL cursor-based pagination
 */
export class GraphQLPaginator {
  /**
   * Extract pagination info from GraphQL response
   */
  static extractPaginationInfo(data: any): { hasNextPage: boolean; endCursor?: string } {
    if (data?.pageInfo) {
      return {
        hasNextPage: data.pageInfo.hasNextPage,
        endCursor: data.pageInfo.endCursor,
      };
    }
    return { hasNextPage: false };
  }

  /**
   * Build query with cursor pagination
   */
  static withPagination(query: string, cursor?: string, first: number = 250): string {
    const afterClause = cursor ? `, after: "${cursor}"` : '';
    return query.replace(/first:\s*\d+/, `first: ${first}${afterClause}`);
  }
}
