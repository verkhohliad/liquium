import { formatEther, formatUnits } from 'viem'
import { format } from 'date-fns'
import { useDealVault } from '../../hooks/useDealVault'
import { DealStatus, type DealCardProps } from '../../types/contracts'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Clock, TrendingUp, Lock, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const statusColors = {
  [DealStatus.Active]: 'bg-green-500',
  [DealStatus.Locked]: 'bg-yellow-500',
  [DealStatus.Settling]: 'bg-blue-500',
  [DealStatus.Finalized]: 'bg-gray-500',
  [DealStatus.Cancelled]: 'bg-red-500',
}

const statusLabels = {
  [DealStatus.Active]: 'Active',
  [DealStatus.Locked]: 'Locked',
  [DealStatus.Settling]: 'Settling',
  [DealStatus.Finalized]: 'Finalized',
  [DealStatus.Cancelled]: 'Cancelled',
}

export function DealCard({ deal, dealId }: DealCardProps) {
  const navigate = useNavigate()
  const { useDealDepositors } = useDealVault()
  const { data: depositors } = useDealDepositors(dealId)

  const startDate = new Date(Number(deal.startTime) * 1000)
  const endDate = new Date((Number(deal.startTime) + Number(deal.duration)) * 1000)
  const expectedYieldPercent = Number(deal.expectedYield) / 100

  const depositorCount = depositors ? depositors.length : 0
  const isActive = deal.status === DealStatus.Active
  const isExpired = Date.now() > endDate.getTime()

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">Deal #{dealId}</CardTitle>
            <CardDescription>
              {format(startDate, 'MMM dd, yyyy')} → {format(endDate, 'MMM dd, yyyy')}
            </CardDescription>
          </div>
          <Badge className={statusColors[deal.status]}>
            {statusLabels[deal.status]}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Total Deposited */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Total Deposited</span>
          <span className="font-semibold">
            {formatUnits(deal.totalDeposited, 6)} USDC
          </span>
        </div>

        {/* Expected Yield */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            Expected Yield
          </span>
          <span className="font-semibold text-green-600">
            {expectedYieldPercent}%
          </span>
        </div>

        {/* Depositors */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Depositors</span>
          <span className="font-semibold">{depositorCount}</span>
        </div>

        {/* Min/Max Deposit */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Deposit Range</span>
          <span>
            {formatUnits(deal.minDeposit, 6)} - {formatUnits(deal.maxDeposit, 6)} USDC
          </span>
        </div>

        {/* Duration */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600 flex items-center gap-1">
            <Clock className="w-4 h-4" />
            Duration
          </span>
          <span>{Number(deal.duration) / 86400} days</span>
        </div>

        {isActive && isExpired && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              This deal has expired and can be locked
            </p>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2">
        {isActive && !isExpired && (
          <Button
            onClick={() => navigate(`/deals/${dealId}/deposit`)}
            className="flex-1"
          >
            Deposit
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => navigate(`/deals/${dealId}`)}
          className="flex-1"
        >
          View Details
        </Button>
      </CardFooter>
    </Card>
  )
}
