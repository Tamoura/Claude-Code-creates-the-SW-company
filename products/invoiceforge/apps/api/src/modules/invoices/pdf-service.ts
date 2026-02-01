import React from 'react';
import {
  renderToBuffer,
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from '@react-pdf/renderer';
import slugify from 'slugify';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#333333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  businessName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  invoiceTitle: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: '#2563eb',
    marginBottom: 4,
  },
  label: {
    fontSize: 8,
    color: '#666666',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  value: {
    fontSize: 10,
    marginBottom: 8,
  },
  billTo: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
    color: '#2563eb',
  },
  table: {
    marginBottom: 24,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 8,
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  colDesc: { flex: 3 },
  colQty: { flex: 1, textAlign: 'right' },
  colRate: { flex: 1, textAlign: 'right' },
  colAmount: { flex: 1, textAlign: 'right' },
  totals: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
    width: 200,
  },
  totalLabel: {
    flex: 1,
    textAlign: 'right',
    paddingRight: 12,
    color: '#666666',
  },
  totalValue: {
    width: 80,
    textAlign: 'right',
  },
  totalFinal: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: 200,
    borderTopWidth: 2,
    borderTopColor: '#2563eb',
    paddingTop: 4,
    marginTop: 4,
  },
  totalFinalLabel: {
    flex: 1,
    textAlign: 'right',
    paddingRight: 12,
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
  },
  totalFinalValue: {
    width: 80,
    textAlign: 'right',
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
  },
  notes: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
  },
  paymentLink: {
    marginTop: 12,
    fontSize: 9,
    color: '#2563eb',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
  },
});

function formatCurrency(cents: number, currency: string): string {
  const amount = cents / 100;
  if (currency === 'USD') {
    return `$${amount.toFixed(2)}`;
  }
  return `${amount.toFixed(2)} ${currency}`;
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTaxRate(basisPoints: number): string {
  return `${(basisPoints / 100).toFixed(2)}%`;
}

export interface PdfInvoiceData {
  invoiceNumber: string;
  status: string;
  invoiceDate: Date | string;
  dueDate: Date | string;
  currency: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes: string | null;
  paymentLink: string | null;
  user: {
    name: string;
    businessName: string | null;
  };
  client: {
    name: string;
    email: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    country: string | null;
  } | null;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
}

function InvoicePDF(props: { data: PdfInvoiceData }) {
  const { data } = props;
  const e = React.createElement;

  const displayName =
    data.user.businessName || data.user.name;
  const clientAddress = data.client
    ? [
        data.client.address,
        data.client.city,
        data.client.state,
        data.client.zip,
        data.client.country,
      ]
        .filter(Boolean)
        .join(', ')
    : '';

  return e(
    Document,
    null,
    e(
      Page,
      { size: 'A4', style: styles.page },
      // Header
      e(
        View,
        { style: styles.header },
        e(
          View,
          { style: styles.headerLeft },
          e(Text, { style: styles.businessName }, displayName),
          e(Text, { style: styles.label }, 'FROM'),
          e(Text, { style: styles.value }, data.user.name)
        ),
        e(
          View,
          { style: styles.headerRight },
          e(Text, { style: styles.invoiceTitle }, 'INVOICE'),
          e(Text, { style: styles.label }, 'Invoice Number'),
          e(
            Text,
            { style: styles.value },
            data.invoiceNumber
          ),
          e(Text, { style: styles.label }, 'Date'),
          e(
            Text,
            { style: styles.value },
            formatDate(data.invoiceDate)
          ),
          e(Text, { style: styles.label }, 'Due Date'),
          e(
            Text,
            { style: styles.value },
            formatDate(data.dueDate)
          )
        )
      ),
      // Bill To
      data.client
        ? e(
            View,
            { style: styles.billTo },
            e(Text, { style: styles.sectionTitle }, 'Bill To'),
            e(Text, { style: styles.value }, data.client.name),
            data.client.email
              ? e(
                  Text,
                  { style: styles.value },
                  data.client.email
                )
              : null,
            clientAddress
              ? e(
                  Text,
                  { style: styles.value },
                  clientAddress
                )
              : null
          )
        : null,
      // Items Table
      e(
        View,
        { style: styles.table },
        e(
          View,
          { style: styles.tableHeader },
          e(Text, { style: styles.colDesc }, 'Description'),
          e(Text, { style: styles.colQty }, 'Qty'),
          e(Text, { style: styles.colRate }, 'Rate'),
          e(Text, { style: styles.colAmount }, 'Amount')
        ),
        ...data.items.map((item, index) =>
          e(
            View,
            { style: styles.tableRow, key: String(index) },
            e(
              Text,
              { style: styles.colDesc },
              item.description
            ),
            e(
              Text,
              { style: styles.colQty },
              String(item.quantity)
            ),
            e(
              Text,
              { style: styles.colRate },
              formatCurrency(item.unitPrice, data.currency)
            ),
            e(
              Text,
              { style: styles.colAmount },
              formatCurrency(item.amount, data.currency)
            )
          )
        )
      ),
      // Totals
      e(
        View,
        { style: styles.totals },
        e(
          View,
          { style: styles.totalRow },
          e(Text, { style: styles.totalLabel }, 'Subtotal'),
          e(
            Text,
            { style: styles.totalValue },
            formatCurrency(data.subtotal, data.currency)
          )
        ),
        data.taxRate > 0
          ? e(
              View,
              { style: styles.totalRow },
              e(
                Text,
                { style: styles.totalLabel },
                `Tax (${formatTaxRate(data.taxRate)})`
              ),
              e(
                Text,
                { style: styles.totalValue },
                formatCurrency(data.taxAmount, data.currency)
              )
            )
          : null,
        e(
          View,
          { style: styles.totalFinal },
          e(Text, { style: styles.totalFinalLabel }, 'Total'),
          e(
            Text,
            { style: styles.totalFinalValue },
            formatCurrency(data.total, data.currency)
          )
        )
      ),
      // Notes
      data.notes
        ? e(
            View,
            { style: styles.notes },
            e(
              Text,
              { style: styles.sectionTitle },
              'Notes'
            ),
            e(Text, null, data.notes)
          )
        : null,
      // Payment Link
      data.paymentLink
        ? e(
            Text,
            { style: styles.paymentLink },
            `Pay online: ${data.paymentLink}`
          )
        : null,
      // Footer
      e(
        Text,
        { style: styles.footer },
        `Generated by InvoiceForge`
      )
    )
  );
}

export async function generatePDF(
  data: PdfInvoiceData
): Promise<Buffer> {
  const element = React.createElement(InvoicePDF, {
    data,
  });
  // renderToBuffer expects a Document element; InvoicePDF
  // returns a Document, so the cast is safe at runtime
  const buffer = await renderToBuffer(element as any);
  return Buffer.from(buffer);
}

export function generateFilename(
  invoiceNumber: string,
  clientName: string | null
): string {
  const sluggedClient = clientName
    ? slugify(clientName, { lower: true, strict: true })
    : 'invoice';
  return `${invoiceNumber}-${sluggedClient}.pdf`;
}
