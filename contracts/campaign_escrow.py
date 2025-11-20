# contracts/campaign_escrow.py
from pyteal import *

def approval_program():
    # Global State
    creator = Bytes("creator")
    target_amount = Bytes("target_amount")
    raised_amount = Bytes("raised_amount")
    start_time = Bytes("start_time")
    end_time = Bytes("end_time")
    campaign_active = Bytes("campaign_active")
    platform_fee = Bytes("platform_fee")  # 2% platform fee

    # Initialize Campaign
    on_initialize = Seq([
        App.globalPut(creator, Txn.application_args[0]),
        App.globalPut(target_amount, Btoi(Txn.application_args[1])),
        App.globalPut(raised_amount, Int(0)),
        App.globalPut(start_time, Global.latest_timestamp()),
        App.globalPut(end_time, Btoi(Txn.application_args[2])),
        App.globalPut(campaign_active, Int(1)),
        App.globalPut(platform_fee, Int(200)),  # 2% in basis points
        Approve()
    ])

    # Donate to Campaign
    on_donate = Seq([
        Assert(App.globalGet(campaign_active) == Int(1)),
        Assert(Global.latest_timestamp() < App.globalGet(end_time)),
        
        # Update raised amount
        App.globalPut(raised_amount, 
            App.globalGet(raised_amount) + Gtxn[0].amount()),
        
        Approve()
    ])

    # Withdraw Funds (Campaign Successful)
    # Withdraw Funds (Campaign Successful)
    platform_fee_var = ScratchVar()
    creator_amount_var = ScratchVar()

    on_withdraw_success = Seq([
        Assert(Global.latest_timestamp() >= App.globalGet(end_time)),
        Assert(App.globalGet(raised_amount) >= App.globalGet(target_amount)),
        Assert(Txn.sender() == App.globalGet(creator)),

        # Calculate platform fee (2%) and creator amount
        platform_fee_var.store(App.globalGet(raised_amount) * App.globalGet(platform_fee) / Int(10000)),
        creator_amount_var.store(App.globalGet(raised_amount) - platform_fee_var.load()),

        # Send funds to creator (minus platform fee)
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.Payment,
            TxnField.amount: creator_amount_var.load(),
            TxnField.receiver: App.globalGet(creator),
            TxnField.fee: Int(0)
        }),
        InnerTxnBuilder.Next(),

        # Send platform fee to platform wallet
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.Payment,
            TxnField.amount: platform_fee_var.load(),
            TxnField.receiver: Txn.accounts[1],  # Platform wallet
            TxnField.fee: Int(0)
        }),
        InnerTxnBuilder.Submit(),

        # Deactivate campaign
        App.globalPut(campaign_active, Int(0)),
        Approve()
    ])

    # Refund Donors (Campaign Failed)
    on_refund = Seq([
        Assert(Global.latest_timestamp() >= App.globalGet(end_time)),
        Assert(App.globalGet(raised_amount) < App.globalGet(target_amount)),
        Assert(Or(Txn.sender() == App.globalGet(creator), Txn.sender() == Txn.accounts[1])),

        # Refund logic would iterate through donors in a real implementation
        # This is simplified - in production you'd need a more complex refund system
        Approve()
    ])

    # Close Campaign (Only before end time)
    on_close = Seq([
        Assert(Global.latest_timestamp() < App.globalGet(end_time)),
        Assert(Txn.sender() == App.globalGet(creator)),
        App.globalPut(campaign_active, Int(0)),
        Approve()
    ])

    program = Cond(
        [Txn.application_id() == Int(0), on_initialize],
        [Txn.on_completion() == OnComplete.NoOp, 
            Cond(
                [Txn.application_args[0] == Bytes("donate"), on_donate],
                [Txn.application_args[0] == Bytes("withdraw"), on_withdraw_success],
                [Txn.application_args[0] == Bytes("refund"), on_refund],
                [Txn.application_args[0] == Bytes("close"), on_close]
            )
        ],
        [Txn.on_completion() == OnComplete.DeleteApplication, Return(Int(0))],
        [Txn.on_completion() == OnComplete.UpdateApplication, Return(Int(0))],
        [Txn.on_completion() == OnComplete.CloseOut, Approve()],
        [Txn.on_completion() == OnComplete.OptIn, Approve()]
    )

    return program

def clear_state_program():
    return Approve()

if __name__ == "__main__":
    with open("campaign_escrow_approval.teal", "w") as f:
        compiled = compileTeal(approval_program(), mode=Mode.Application, version=6)
        f.write(compiled)

    with open("campaign_escrow_clear.teal", "w") as f:
        compiled = compileTeal(clear_state_program(), mode=Mode.Application, version=6)
        f.write(compiled)