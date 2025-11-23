import { useState } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { useDealVault } from '../../hooks/useDealVault'
import type { DepositFormProps } from '../../types/contracts'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card'
import { Alert, AlertDescription } from '../ui/alert'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { CONTRACTS } from '../lib/wagmi'
import ERC20ABI from '../lib/contracts/ERC20.json'

export function DepositForm({ dealId, deal }: DepositFormProps) {
  const { address } = useAccount()
  const [amount, setAmount] = useState('')
  const [yellowAddress, setYellowAddress] = useState(address || '')
  const [step, setStep] = useState<'input' | 'approve' | 'deposit' | 'complete'>('input')

  const { writeContractAsync } = useWriteContract()
  const { deposit, setUserYellowAddress } = useDealVault()

  // Read USDC balance
  const { data: balance } = useReadContract({
    address: deal.depositToken,
    abi: ERC20ABI,
    functionName: 'balanceOf',
    args: [address!],
    query: { enabled: !!address },
  })

  // Read USDC allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: deal.depositToken,
    abi: ERC20ABI,
    functionName: 'allowance',
    args: [address!, CONTRACTS.DEAL_VAULT],
    query: { enabled: !!address },
  })

  const [approveTxHash, setApproveTxHash] = useState<`0x${string}` | undefined>()
  const [depositTxHash, setDepositTxHash] = useState<`0x${string}` | undefined>()

  const { isLoading: isApproving } = useWaitForTransactionReceipt({ hash: approveTxHash })
  const { isLoading: isDepositing } = useWaitForTransactionReceipt({ hash: depositTxHash })

  const amountBigInt = amount ? parseUnits(amount, 6) : 0n
  const minDeposit = formatUnits(deal.minDeposit, 6)
  const maxDeposit = formatUnits(deal.maxDeposit, 6)
  const userBalance = balance ? formatUnits(balance as bigint, 6) : '0'

  const needsApproval = allowance ? (allowance as bigint) < amountBigInt : true

  const handleApprove = async () => {
    if (!address || !amountBigInt) return

    try {
      setStep('approve')
      const hash = await writeContractAsync({
        address: deal.depositToken,
        abi: ERC20ABI,
        functionName: 'approve',
        args: [CONTRACTS.DEAL_VAULT, amountBigInt],
      })
      setApproveTxHash(hash)
      await refetchAllowance()
    } catch (error) {
      console.error('Approval failed:', error)
      setStep('input')
    }
  }

  const handleDeposit = async () => {
    if (!address || !amountBigInt) return

    try {
      setStep('deposit')

      // Set Yellow address if different
      if (yellowAddress !== address) {
        await setUserYellowAddress(dealId, yellowAddress as `0x${string}`)
      }

      // Deposit
      const hash = await deposit(dealId, amountBigInt)
      setDepositTxHash(hash)
      setStep('complete')
    } catch (error) {
      console.error('Deposit failed:', error)
      setStep('input')
    }
  }

  const isAmountValid = () => {
    if (!amount) return false
    const amt = parseFloat(amount)
    const min = parseFloat(minDeposit)
    const max = parseFloat(maxDeposit)
    return amt >= min && amt <= max
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deposit to Deal #{dealId}</CardTitle>
        <CardDescription>
          Deposit USDC to participate in this deal and earn {Number(deal.expectedYield) / 100}% yield
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Balance */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Your USDC Balance</span>
            <span className="font-semibold">{userBalance} USDC</span>
          </div>
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Deposit Amount</label>
          <Input
            type="number"
            placeholder={`Min: ${minDeposit}, Max: ${maxDeposit}`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={step !== 'input'}
          />
          <p className="text-xs text-gray-500">
            Range: {minDeposit} - {maxDeposit} USDC
          </p>
        </div>

        {/* Yellow Address */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Yellow Network Address (optional)</label>
          <Input
            type="text"
            placeholder="0x..."
            value={yellowAddress}
            onChange={(e) => setYellowAddress(e.target.value)}
            disabled={step !== 'input'}
          />
          <p className="text-xs text-gray-500">
            Address to receive rewards on Yellow Network. Defaults to your wallet address.
          </p>
        </div>

        {/* Status Alerts */}
        {step === 'approve' && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>Approving USDC... Please confirm in your wallet.</AlertDescription>
          </Alert>
        )}

        {step === 'deposit' && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>Depositing... Please wait for confirmation.</AlertDescription>
          </Alert>
        )}

        {step === 'complete' && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Deposit successful! You'll receive a Position NFT shortly.
            </AlertDescription>
          </Alert>
        )}

        {!isAmountValid() && amount && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Amount must be between {minDeposit} and {maxDeposit} USDC
            </AlertDescription>
          </Alert>
        )}
      </CardContent>

      <CardFooter>
        {needsApproval && step === 'input' ? (
          <Button
            onClick={handleApprove}
            disabled={!isAmountValid() || isApproving}
            className="w-full"
          >
            {isApproving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Approving...
              </>
            ) : (
              'Approve USDC'
            )}
          </Button>
        ) : step === 'input' ? (
          <Button
            onClick={handleDeposit}
            disabled={!isAmountValid() || isDepositing}
            className="w-full"
          >
            {isDepositing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Depositing...
              </>
            ) : (
              'Deposit'
            )}
          </Button>
        ) : step === 'complete' ? (
          <Button onClick={() => window.location.href = `/deals/${dealId}`} className="w-full">
            View Deal Details
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  )
}
