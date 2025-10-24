import { API_URL } from '@/config/api';
import { useMode } from '@/contexts/ModeContext';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert as RNAlert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface MedicationRequest {
  id: number;
  user_id: string;
  name: string;
  dosage?: string;
  frequency?: string;
  schedule?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  processed_at?: string;
  processed_by?: string;
  rejection_reason?: string;
}

export default function MedicationRequestsScreen() {
  const router = useRouter();
  const { userId, userName } = useMode();
  const [requests, setRequests] = useState<MedicationRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  /**
   * Cargar solicitudes de medicamentos
   */
  const fetchRequests = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      const statusParam = filter === 'pending' ? '?status=pending' : '';
      const response = await axios.get(`${API_URL}/medication-requests/${userId}${statusParam}`);

      setRequests(response.data.requests);
    } catch (error: any) {
      console.error('Error cargando solicitudes:', error);
      RNAlert.alert('Error', 'No se pudieron cargar las solicitudes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Aprobar solicitud
   */
  const handleApprove = async (requestId: number, medicationName: string) => {
    RNAlert.alert(
      'Aprobar Solicitud',
      `¿Aprobar el medicamento "${medicationName}"? Esto lo agregará automáticamente a los medicamentos activos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aprobar',
          style: 'default',
          onPress: async () => {
            try {
              setLoading(true);
              
              await axios.put(`${API_URL}/medication-requests/${requestId}/approve`, {
                processedBy: userName || 'Tutor'
              });

              RNAlert.alert(
                'Aprobado',
                `El medicamento "${medicationName}" ha sido agregado exitosamente`,
                [{ text: 'OK', onPress: () => fetchRequests() }]
              );
            } catch (error: any) {
              console.error('Error aprobando solicitud:', error);
              RNAlert.alert('Error', error.response?.data?.error || 'No se pudo aprobar la solicitud');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  /**
   * Rechazar solicitud
   */
  const handleReject = async (requestId: number, medicationName: string) => {
    RNAlert.alert(
      'Rechazar Solicitud',
      `¿Estás seguro de rechazar "${medicationName}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rechazar',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              await axios.put(`${API_URL}/medication-requests/${requestId}/reject`, {
                processedBy: userName || 'Tutor',
                rejectionReason: 'Rechazado por el tutor'
              });

              RNAlert.alert(
                'Rechazado',
                `La solicitud de "${medicationName}" ha sido rechazada`,
                [{ text: 'OK', onPress: () => fetchRequests() }]
              );
            } catch (error: any) {
              console.error('Error rechazando solicitud:', error);
              RNAlert.alert('Error', error.response?.data?.error || 'No se pudo rechazar la solicitud');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  /**
   * Formatear fecha
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;

    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  /**
   * Refresh handler
   */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRequests(false);
  }, [filter]);

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  /**
   * Renderizar solicitud
   */
  const renderRequest = (request: MedicationRequest) => {
    const isPending = request.status === 'pending';
    const isApproved = request.status === 'approved';

    return (
      <View
        key={request.id}
        style={[
          styles.requestCard,
          isPending && styles.pendingCard,
          isApproved && styles.approvedCard,
          !isPending && !isApproved && styles.rejectedCard,
        ]}
      >
        {/* Header */}
        <View style={styles.requestHeader}>
          <View style={styles.requestTitleContainer}>
            <Text style={styles.requestName}>{request.name}</Text>
            <Text style={[
              styles.statusBadge,
              isPending && styles.pendingBadge,
              isApproved && styles.approvedBadge,
              !isPending && !isApproved && styles.rejectedBadge,
            ]}>
              {request.status === 'pending' ? '⏳ Pendiente' : 
               request.status === 'approved' ? '✅ Aprobado' : 
               '❌ Rechazado'}
            </Text>
          </View>
          <Text style={styles.requestDate}>{formatDate(request.requested_at)}</Text>
        </View>

        {/* Información */}
        <View style={styles.requestInfo}>
          {request.dosage && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Dosis:</Text>
              <Text style={styles.infoValue}>{request.dosage}</Text>
            </View>
          )}
          {request.frequency && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Frecuencia:</Text>
              <Text style={styles.infoValue}>{request.frequency}</Text>
            </View>
          )}
          {request.schedule && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Horarios:</Text>
              <Text style={styles.infoValue}>{request.schedule}</Text>
            </View>
          )}
          {request.notes && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Notas:</Text>
              <Text style={styles.infoValue}>{request.notes}</Text>
            </View>
          )}
        </View>

        {/* Información de procesamiento */}
        {request.processed_at && (
          <View style={styles.processedInfo}>
            <Text style={styles.processedText}>
              {request.status === 'approved' ? 'Aprobado' : 'Rechazado'} por {request.processed_by}
            </Text>
            <Text style={styles.processedDate}>{formatDate(request.processed_at)}</Text>
            {request.rejection_reason && (
              <Text style={styles.rejectionReason}>Motivo: {request.rejection_reason}</Text>
            )}
          </View>
        )}

        {/* Botones de acción (solo para pendientes) */}
        {isPending && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => router.push(`/(tutor)/edit-request?id=${request.id}`)}
              disabled={loading}
            >
              <Text style={styles.editButtonText}>✏️ Editar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleReject(request.id, request.name)}
              disabled={loading}
            >
              <Text style={styles.rejectButtonText}>❌ Rechazar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleApprove(request.id, request.name)}
              disabled={loading}
            >
              <Text style={styles.approveButtonText}>✅ Aprobar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Solicitudes de Medicamentos</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Filtros */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'pending' && styles.filterButtonActive]}
          onPress={() => setFilter('pending')}
        >
          <Text
            style={[styles.filterButtonText, filter === 'pending' && styles.filterButtonTextActive]}
          >
            Pendientes {pendingCount > 0 && `(${pendingCount})`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterButtonText, filter === 'all' && styles.filterButtonTextActive]}>
            Todas ({requests.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Lista de solicitudes */}
      {loading && !refreshing ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loaderText}>Cargando solicitudes...</Text>
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>
            {filter === 'pending' ? 'No hay solicitudes pendientes' : 'No hay solicitudes'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {filter === 'pending'
              ? 'Cuando el usuario solicite un medicamento, aparecerá aquí'
              : 'Aún no se han realizado solicitudes de medicamentos'}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {requests.map(renderRequest)}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  placeholder: {
    width: 60,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#FFF',
  },
  scrollView: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loaderText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  requestCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pendingCard: {
    borderColor: '#FFA500',
  },
  approvedCard: {
    borderColor: '#4CAF50',
  },
  rejectedCard: {
    borderColor: '#F44336',
  },
  requestHeader: {
    marginBottom: 12,
  },
  requestTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  requestName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    flex: 1,
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  pendingBadge: {
    backgroundColor: '#FFF3E0',
    color: '#FF9800',
  },
  approvedBadge: {
    backgroundColor: '#E8F5E9',
    color: '#4CAF50',
  },
  rejectedBadge: {
    backgroundColor: '#FFEBEE',
    color: '#F44336',
  },
  requestDate: {
    fontSize: 12,
    color: '#999',
  },
  requestInfo: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    width: 90,
  },
  infoValue: {
    fontSize: 14,
    color: '#1A1A1A',
    flex: 1,
  },
  processedInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  processedText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  processedDate: {
    fontSize: 12,
    color: '#999',
  },
  rejectionReason: {
    fontSize: 13,
    color: '#F44336',
    marginTop: 6,
    fontStyle: 'italic',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#2196F3',
  },
  editButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  approveButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
