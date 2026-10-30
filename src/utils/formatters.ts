import { Order, OrderStatus, PaymentStatus, Shop } from '../types';

export const formatCurrency = (amount: number, currency: string = 'Ar'): string => {
  const formatted = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${formatted} ${currency}`;
};

export const formatDate = (isoString: string): string => {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  } catch {
    return isoString;
  }
};

export const formatDateShort = (isoString: string): string => {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short'
    }).format(d);
  } catch {
    return isoString;
  }
};

export interface StatusMeta {
  label: string;
  description: string;
  badgeClass: string;
}

export const getOrderStatusMeta = (status: OrderStatus): StatusMeta => {
  switch (status) {
    case 'A_CONFIRMER':
      return {
        label: 'À confirmer',
        description: 'Enregistrée, validation client ou vendeur attendue',
        badgeClass: 'bg-zinc-100 text-zinc-900 border-zinc-400 font-medium'
      };
    case 'RESERVEE':
      return {
        label: 'Réservée',
        description: 'Article mis de côté, stock bloqué',
        badgeClass: 'bg-zinc-800 text-zinc-100 border-zinc-700 font-semibold'
      };
    case 'A_PREPARER':
      return {
        label: 'À préparer',
        description: 'Commande confirmée, emballage requis',
        badgeClass: 'bg-zinc-900 text-white border-black font-semibold'
      };
    case 'PRETE':
      return {
        label: 'Prête / à expédier',
        description: 'Prête pour coursier ou remise en main propre',
        badgeClass: 'bg-zinc-200 text-zinc-900 border-zinc-500 font-semibold'
      };
    case 'LIVREE':
      return {
        label: 'Livrée',
        description: 'Remise au client effectuée avec succès',
        badgeClass: 'bg-black text-white border-black font-bold tracking-wide'
      };
    case 'ANNULEE':
      return {
        label: 'Annulée',
        description: 'Annulée, stock disponible libéré',
        badgeClass: 'bg-white text-zinc-400 line-through border-zinc-300'
      };
    default:
      return {
        label: status,
        description: '',
        badgeClass: 'bg-zinc-100 text-zinc-800 border-zinc-300'
      };
  }
};

export const getPaymentStatusMeta = (status: PaymentStatus): { label: string; badgeClass: string } => {
  switch (status) {
    case 'NON_PAYE':
      return {
        label: 'Non payé',
        badgeClass: 'bg-white text-zinc-900 border-dashed border-zinc-400'
      };
    case 'ACOMPTE_RECU':
      return {
        label: 'Acompte reçu',
        badgeClass: 'bg-zinc-200 text-zinc-900 border-zinc-600 font-medium'
      };
    case 'PAYE':
      return {
        label: 'Payé',
        badgeClass: 'bg-zinc-950 text-white border-zinc-950 font-bold'
      };
    default:
      return {
        label: status,
        badgeClass: 'bg-zinc-100 text-zinc-700 border-zinc-300'
      };
  }
};

/**
 * Builds professional WhatsApp message for social commerce confirmation
 */
export const buildWhatsAppMessage = (
  order: Order,
  clientName: string,
  shop: Shop
): string => {
  const currency = shop.devise || 'Ar';
  const statusMeta = getOrderStatusMeta(order.statut);
  const paymentMeta = getPaymentStatusMeta(order.statutPaiement);

  const lines = order.items
    .map(
      (item, i) =>
        `${i + 1}. ${item.nomProduitSnapshot} x ${item.quantite} = ${formatCurrency(item.totalLigne, currency)}`
    )
    .join('\n');

  const resteAPayer = Math.max(0, order.total - (order.montantPaye || 0));

  return `Bonjour ${clientName},\n\nVoici le récapitulatif de votre commande chez *${shop.nom}* :\n\n` +
    `N° de commande : ${order.numero}\n` +
    `Statut : ${statusMeta.label}\n\n` +
    `Articles :\n${lines}\n\n` +
    `Total : ${formatCurrency(order.total, currency)}\n` +
    `Paiement : ${paymentMeta.label}` +
    (order.montantPaye > 0 ? ` (${formatCurrency(order.montantPaye, currency)} reçu)` : '') +
    (resteAPayer > 0 ? `\nReste à payer : ${formatCurrency(resteAPayer, currency)}` : '\nRèglement complet') +
    (order.adresseLivraison ? `\nLieu de livraison : ${order.adresseLivraison}` : '') +
    (order.note ? `\nNote : ${order.note}` : '') +
    `\n\nMerci pour votre confiance !\nContact : ${shop.telephone}`;
};

/**
 * Exports data to CSV string and initiates browser download
 */
export const exportToCSV = (filename: string, rows: Record<string, any>[]): void => {
  if (!rows || !rows.length) return;
  const separator = ',';
  const keys = Object.keys(rows[0]);
  const csvContent =
    keys.join(separator) +
    '\n' +
    rows
      .map(row => {
        return keys
          .map(k => {
            let cell = row[k] === null || row[k] === undefined ? '' : String(row[k]);
            cell = cell.replace(/"/g, '""');
            if (cell.search(/("|,|\n)/g) >= 0) {
              cell = `"${cell}"`;
            }
            return cell;
          })
          .join(separator);
      })
      .join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
