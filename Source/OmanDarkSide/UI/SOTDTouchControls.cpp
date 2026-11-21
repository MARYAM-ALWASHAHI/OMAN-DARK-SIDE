#include "UI/SOTDTouchControls.h"

#include "Player/OTDCharacter.h"
#include "Styling/CoreStyle.h"
#include "Widgets/Input/SButton.h"
#include "Widgets/Layout/SBox.h"
#include "Widgets/Layout/SSafeZone.h"
#include "Widgets/SBoxPanel.h"
#include "Widgets/SOverlay.h"
#include "Widgets/Text/STextBlock.h"

void SOTDTouchControls::Construct(const FArguments& InArgs)
{
	Character = InArgs._Character;

	// Pass-through everywhere except the buttons, so touches still reach the joysticks/viewport.
	SetVisibility(EVisibility::SelfHitTestInvisible);

	TWeakObjectPtr<AOTDCharacter> WeakChar = Character;

	ChildSlot
	[
		SNew(SSafeZone) // respects notches / rounded corners on phones and iPads
		.Visibility(EVisibility::SelfHitTestInvisible)
		[
			SNew(SOverlay)
			.Visibility(EVisibility::SelfHitTestInvisible)
			// Right edge, vertically centred: stays clear of the bottom-right look joystick.
			+ SOverlay::Slot()
			.HAlign(HAlign_Right)
			.VAlign(VAlign_Center)
			.Padding(FMargin(0.f, 0.f, 32.f, 0.f))
			[
				SNew(SVerticalBox)
				.Visibility(EVisibility::SelfHitTestInvisible)
				+ SVerticalBox::Slot().AutoHeight().Padding(FMargin(0.f, 8.f))
				[
					MakeButton(TAttribute<FText>::Create(TAttribute<FText>::FGetter::CreateSP(this, &SOTDTouchControls::GetCrouchLabel)),
						FSimpleDelegate::CreateLambda([WeakChar]() { if (WeakChar.IsValid()) { WeakChar->ToggleCrouch(); } }),
						FSimpleDelegate())
				]
				+ SVerticalBox::Slot().AutoHeight().Padding(FMargin(0.f, 8.f))
				[
					MakeButton(TAttribute<FText>::Create(TAttribute<FText>::FGetter::CreateSP(this, &SOTDTouchControls::GetRunLabel)),
						FSimpleDelegate::CreateLambda([WeakChar]() { if (WeakChar.IsValid()) { WeakChar->ToggleSprint(); } }),
						FSimpleDelegate())
				]
				+ SVerticalBox::Slot().AutoHeight().Padding(FMargin(0.f, 8.f))
				[
					MakeButton(FText::FromString(TEXT("JUMP")),
						FSimpleDelegate::CreateLambda([WeakChar]() { if (WeakChar.IsValid()) { WeakChar->Jump(); } }),
						FSimpleDelegate::CreateLambda([WeakChar]() { if (WeakChar.IsValid()) { WeakChar->StopJumping(); } }))
				]
			]
		]
	];
}

TSharedRef<SWidget> SOTDTouchControls::MakeButton(const TAttribute<FText>& Label, FSimpleDelegate OnPressed, FSimpleDelegate OnReleased)
{
	return SNew(SBox)
		.WidthOverride(150.f)
		.HeightOverride(96.f)
		[
			SNew(SButton)
			.IsFocusable(false) // never steal focus from the game viewport
			.ButtonColorAndOpacity(FLinearColor(0.f, 0.f, 0.f, 0.45f))
			.HAlign(HAlign_Center)
			.VAlign(VAlign_Center)
			.OnPressed(OnPressed)
			.OnReleased(OnReleased)
			[
				SNew(STextBlock)
				.Text(Label)
				.Font(FCoreStyle::GetDefaultFontStyle("Bold", 20))
				.ColorAndOpacity(FLinearColor(0.93f, 0.88f, 0.80f, 1.f))
			]
		];
}

FText SOTDTouchControls::GetRunLabel() const
{
	return FText::FromString(Character.IsValid() && Character->IsSprinting() ? TEXT("WALK") : TEXT("RUN"));
}

FText SOTDTouchControls::GetCrouchLabel() const
{
	return FText::FromString(Character.IsValid() && Character->bIsCrouched ? TEXT("STAND") : TEXT("CROUCH"));
}
