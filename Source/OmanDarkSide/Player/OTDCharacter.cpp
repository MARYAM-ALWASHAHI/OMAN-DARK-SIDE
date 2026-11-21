#include "Player/OTDCharacter.h"

#include "OmanDarkSide.h"
#include "Camera/CameraComponent.h"
#include "Components/CapsuleComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/Engine.h"
#include "Engine/LocalPlayer.h"
#include "Engine/StaticMesh.h"
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/PlayerController.h"
#include "GameFramework/SpringArmComponent.h"
#include "InputAction.h"
#include "InputActionValue.h"
#include "InputMappingContext.h"
#include "InputModifiers.h"
#include "UObject/ConstructorHelpers.h"

AOTDCharacter::AOTDCharacter()
{
	PrimaryActorTick.bCanEverTick = false;

	GetCapsuleComponent()->InitCapsuleSize(34.f, 88.f);

	// Rotation defaults (third person); SetCameraMode switches these at runtime.
	bUseControllerRotationPitch = false;
	bUseControllerRotationYaw = false;
	bUseControllerRotationRoll = false;

	UCharacterMovementComponent* Move = GetCharacterMovement();
	Move->bOrientRotationToMovement = true;
	Move->RotationRate = FRotator(0.f, 500.f, 0.f);
	Move->MaxWalkSpeed = WalkSpeed;
	Move->JumpZVelocity = 420.f;
	Move->AirControl = 0.25f;

	CameraBoom = CreateDefaultSubobject<USpringArmComponent>(TEXT("CameraBoom"));
	CameraBoom->SetupAttachment(RootComponent);
	CameraBoom->TargetArmLength = ThirdPersonArmLength;
	CameraBoom->SocketOffset = FVector(0.f, 40.f, 60.f); // over-the-shoulder
	CameraBoom->bUsePawnControlRotation = true;

	ThirdPersonCamera = CreateDefaultSubobject<UCameraComponent>(TEXT("ThirdPersonCamera"));
	ThirdPersonCamera->SetupAttachment(CameraBoom, USpringArmComponent::SocketName);
	ThirdPersonCamera->bUsePawnControlRotation = false;

	FirstPersonCamera = CreateDefaultSubobject<UCameraComponent>(TEXT("FirstPersonCamera"));
	FirstPersonCamera->SetupAttachment(GetCapsuleComponent());
	FirstPersonCamera->SetRelativeLocation(FVector(10.f, 0.f, FirstPersonEyeHeight));
	FirstPersonCamera->bUsePawnControlRotation = true;
	FirstPersonCamera->SetAutoActivate(false);

	// Placeholder body: engine basic cylinder (100uu diameter/height), scaled to the capsule.
	PlaceholderBody = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("PlaceholderBody"));
	PlaceholderBody->SetupAttachment(GetCapsuleComponent());
	PlaceholderBody->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	PlaceholderBody->SetRelativeScale3D(FVector(0.68f, 0.68f, 1.76f));
	static ConstructorHelpers::FObjectFinder<UStaticMesh> CylinderMesh(TEXT("/Engine/BasicShapes/Cylinder.Cylinder"));
	if (CylinderMesh.Succeeded())
	{
		PlaceholderBody->SetStaticMesh(CylinderMesh.Object);
	}
}

void AOTDCharacter::BeginPlay()
{
	Super::BeginPlay();

	// Apply values possibly overridden in a Blueprint subclass.
	GetCharacterMovement()->MaxWalkSpeed = WalkSpeed;
	CameraBoom->TargetArmLength = ThirdPersonArmLength;
	FirstPersonCamera->SetRelativeLocation(FVector(10.f, 0.f, FirstPersonEyeHeight));

	SetCameraMode(StartingCameraMode);
}

void AOTDCharacter::PawnClientRestart()
{
	Super::PawnClientRestart();
	BuildDefaultInputIfMissing();
	AddMappingContextToLocalPlayer();
}

void AOTDCharacter::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
	Super::SetupPlayerInputComponent(PlayerInputComponent);
	BuildDefaultInputIfMissing();

	UEnhancedInputComponent* EIC = Cast<UEnhancedInputComponent>(PlayerInputComponent);
	if (!EIC)
	{
		UE_LOG(LogOTD, Error, TEXT("OTDCharacter requires EnhancedInputComponent. Check Config/DefaultInput.ini."));
		return;
	}

	EIC->BindAction(MoveAction, ETriggerEvent::Triggered, this, &AOTDCharacter::HandleMove);
	EIC->BindAction(LookAction, ETriggerEvent::Triggered, this, &AOTDCharacter::HandleLook);
	EIC->BindAction(JumpAction, ETriggerEvent::Started, this, &ACharacter::Jump);
	EIC->BindAction(JumpAction, ETriggerEvent::Completed, this, &ACharacter::StopJumping);
	EIC->BindAction(SprintAction, ETriggerEvent::Started, this, &AOTDCharacter::HandleSprintStarted);
	EIC->BindAction(SprintAction, ETriggerEvent::Completed, this, &AOTDCharacter::HandleSprintStopped);
	EIC->BindAction(ToggleCameraAction, ETriggerEvent::Started, this, &AOTDCharacter::HandleToggleCamera);
}

void AOTDCharacter::BuildDefaultInputIfMissing()
{
	const bool bAllAssigned = DefaultMappingContext && MoveAction && LookAction && JumpAction && SprintAction && ToggleCameraAction;
	if (bAllAssigned)
	{
		return;
	}

	UE_LOG(LogOTD, Log, TEXT("OTDCharacter: input assets not fully assigned, building runtime keyboard/mouse defaults."));

	auto MakeAction = [this](const TCHAR* Name, EInputActionValueType Type)
	{
		UInputAction* Action = NewObject<UInputAction>(this, Name);
		Action->ValueType = Type;
		return Action;
	};

	MoveAction = MakeAction(TEXT("IA_Move_Runtime"), EInputActionValueType::Axis2D);
	LookAction = MakeAction(TEXT("IA_Look_Runtime"), EInputActionValueType::Axis2D);
	JumpAction = MakeAction(TEXT("IA_Jump_Runtime"), EInputActionValueType::Boolean);
	SprintAction = MakeAction(TEXT("IA_Sprint_Runtime"), EInputActionValueType::Boolean);
	ToggleCameraAction = MakeAction(TEXT("IA_ToggleCamera_Runtime"), EInputActionValueType::Boolean);

	UInputMappingContext* IMC = NewObject<UInputMappingContext>(this, TEXT("IMC_Default_Runtime"));
	DefaultMappingContext = IMC;

	auto Swizzle = [IMC]() { return NewObject<UInputModifierSwizzleAxis>(IMC); }; // default order YXZ
	auto NegateAll = [IMC]() { return NewObject<UInputModifierNegate>(IMC); };
	auto NegateY = [IMC]()
	{
		UInputModifierNegate* N = NewObject<UInputModifierNegate>(IMC);
		N->bX = false;
		N->bY = true;
		N->bZ = false;
		return N;
	};

	// WASD -> 2D move (X = right, Y = forward)
	IMC->MapKey(MoveAction, EKeys::D);
	IMC->MapKey(MoveAction, EKeys::A).Modifiers.Add(NegateAll());
	IMC->MapKey(MoveAction, EKeys::W).Modifiers.Add(Swizzle());
	{
		FEnhancedActionKeyMapping& S = IMC->MapKey(MoveAction, EKeys::S);
		S.Modifiers.Add(Swizzle());
		S.Modifiers.Add(NegateAll());
	}

	// Mouse look (Y negated so moving the mouse up looks up)
	IMC->MapKey(LookAction, EKeys::Mouse2D).Modifiers.Add(NegateY());

	IMC->MapKey(JumpAction, EKeys::SpaceBar);
	IMC->MapKey(SprintAction, EKeys::LeftShift);
	IMC->MapKey(ToggleCameraAction, EKeys::V);
}

void AOTDCharacter::AddMappingContextToLocalPlayer()
{
	const APlayerController* PC = Cast<APlayerController>(GetController());
	if (!PC || !DefaultMappingContext)
	{
		return;
	}
	if (ULocalPlayer* LP = PC->GetLocalPlayer())
	{
		if (UEnhancedInputLocalPlayerSubsystem* Subsystem = LP->GetSubsystem<UEnhancedInputLocalPlayerSubsystem>())
		{
			Subsystem->RemoveMappingContext(DefaultMappingContext);
			Subsystem->AddMappingContext(DefaultMappingContext, 0);
		}
	}
}

void AOTDCharacter::HandleMove(const FInputActionValue& Value)
{
	const FVector2D Axis = Value.Get<FVector2D>();
	if (!Controller)
	{
		return;
	}
	const FRotator YawRotation(0.f, Controller->GetControlRotation().Yaw, 0.f);
	const FRotationMatrix YawMatrix(YawRotation);
	AddMovementInput(YawMatrix.GetUnitAxis(EAxis::X), Axis.Y);
	AddMovementInput(YawMatrix.GetUnitAxis(EAxis::Y), Axis.X);
}

void AOTDCharacter::HandleLook(const FInputActionValue& Value)
{
	const FVector2D Axis = Value.Get<FVector2D>();
	AddControllerYawInput(Axis.X);
	AddControllerPitchInput(Axis.Y);
}

void AOTDCharacter::HandleSprintStarted()
{
	bIsSprinting = true;
	GetCharacterMovement()->MaxWalkSpeed = SprintSpeed;
	DebugMessage(TEXT("Sprint: ON"));
}

void AOTDCharacter::HandleSprintStopped()
{
	bIsSprinting = false;
	GetCharacterMovement()->MaxWalkSpeed = WalkSpeed;
	DebugMessage(TEXT("Sprint: OFF"));
}

void AOTDCharacter::HandleToggleCamera()
{
	SetCameraMode(CameraMode == EOTDCameraMode::ThirdPerson ? EOTDCameraMode::FirstPerson : EOTDCameraMode::ThirdPerson);
}

void AOTDCharacter::SetCameraMode(EOTDCameraMode NewMode)
{
	CameraMode = NewMode;
	const bool bFirstPerson = (NewMode == EOTDCameraMode::FirstPerson);

	FirstPersonCamera->SetActive(bFirstPerson);
	ThirdPersonCamera->SetActive(!bFirstPerson);

	// First person: body faces where the camera looks. Third person: body faces movement direction.
	bUseControllerRotationYaw = bFirstPerson;
	GetCharacterMovement()->bOrientRotationToMovement = !bFirstPerson;

	// Hide the placeholder body from the owning player's own view in first person.
	PlaceholderBody->SetOwnerNoSee(bFirstPerson);

	DebugMessage(bFirstPerson ? TEXT("Camera: FIRST PERSON") : TEXT("Camera: THIRD PERSON"));
}

void AOTDCharacter::DebugMessage(const FString& Message) const
{
	UE_LOG(LogOTD, Log, TEXT("%s"), *Message);
	if (bShowDebugMessages && GEngine)
	{
		GEngine->AddOnScreenDebugMessage(INDEX_NONE, 2.f, FColor::Cyan, Message);
	}
}
